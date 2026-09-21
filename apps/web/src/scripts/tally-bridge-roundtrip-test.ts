/**
 * Tally Bridge Real-Cloud Job Round-Trip Verification Test
 * ─────────────────────────────────────────────────────────
 * Standalone test script verifying end-to-end P3a bridge behavior:
 * 1. Admin + session creation in local MongoDB
 * 2. Pairing code creation via real cloud API (/api/tally/bridge/pairing-codes)
 * 3. Local fake Tally server
 * 4. Bridge core import (compiled tools/tally-bridge/dist/core)
 * 5. Device pairing + poll loop start
 * 6. Job enqueue + execution round-trip (assert failed with EXECUTOR_NOT_IMPLEMENTED)
 * 7. Device online & Tally reachable check via /api/tally/bridge/devices
 * 8. Fake Tally stop, 2 poll cycles, enqueue second job, assert remains pending
 * 9. Poller stop, data cleanup, document count safety verification
 * 10. Logger privacy assertion (token and requestXml never logged)
 *
 * Run: npx tsx src/scripts/tally-bridge-roundtrip-test.ts (from apps/web)
 */

import { MongoClient, ObjectId } from "mongodb";
import * as http from "node:http";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { enqueueTallyJob } from "@/services/tally/bridge/tallyBridgeService";

// ─── Config ─────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "ind_manager";
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// ─── Safety Check: localhost only ───────────────────────────────

function assertLocalhost() {
    try {
        const url = new URL(MONGODB_URI);
        const host = url.hostname;
        if (host !== "localhost" && host !== "127.0.0.1") {
            console.error(`❌ SAFETY: MongoDB host is "${host}", not localhost/127.0.0.1. Refusing to run.`);
            process.exit(1);
        }
    } catch {
        if (!MONGODB_URI.includes("localhost") && !MONGODB_URI.includes("127.0.0.1")) {
            console.error(`❌ SAFETY: MongoDB URI does not contain localhost/127.0.0.1. Refusing to run.`);
            process.exit(1);
        }
    }
}

// ─── State Tracking for Cleanup ─────────────────────────────────

const createdIds = {
    users: [] as string[],
    sessions: [] as string[],
    pairingCodes: [] as string[],
    devices: [] as string[],
    jobs: [] as string[],
    orgs: [] as string[],
};

let initialCounts: Record<string, number> = {};
let mongoClient: MongoClient;

// ─── In-Memory Bridge Adapters ──────────────────────────────────

class InMemoryTokenStore {
    private token: string | null = null;
    async getToken(): Promise<string | null> {
        return this.token;
    }
    async setToken(t: string): Promise<void> {
        this.token = t;
    }
    async clearToken(): Promise<void> {
        this.token = null;
    }
}

class InMemoryConfigStore {
    private config: any = null;
    constructor(initialConfig?: any) {
        if (initialConfig) this.config = { ...initialConfig };
    }
    async getConfig(): Promise<any> {
        return this.config ? { ...this.config } : null;
    }
    async saveConfig(c: any): Promise<void> {
        this.config = { ...c };
    }
    async clearConfig(): Promise<void> {
        this.config = null;
    }
}

class CapturingLogger {
    public lines: string[] = [];
    info(msg: string, meta?: any) {
        this.lines.push(`INFO: ${msg} ${JSON.stringify(meta || {})}`);
    }
    warn(msg: string, meta?: any) {
        this.lines.push(`WARN: ${msg} ${JSON.stringify(meta || {})}`);
    }
    error(msg: string, meta?: any) {
        this.lines.push(`ERROR: ${msg} ${JSON.stringify(meta || {})}`);
    }
}

// ─── HTTP Helper ────────────────────────────────────────────────

interface HttpResult {
    status: number;
    body: any;
    headers: http.IncomingHttpHeaders;
}

function httpRequest(
    method: string,
    reqPath: string,
    options: {
        body?: unknown;
        cookie?: string;
        bearer?: string;
    } = {},
): Promise<HttpResult> {
    return new Promise((resolve, reject) => {
        const url = new URL(reqPath, BASE_URL);
        const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (options.cookie) headers["Cookie"] = options.cookie;
        if (options.bearer) headers["Authorization"] = `Bearer ${options.bearer}`;
        if (bodyStr) headers["Content-Length"] = String(Buffer.byteLength(bodyStr));

        const req = http.request(
            {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method,
                headers,
                timeout: 15000,
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (c: Buffer) => chunks.push(c));
                res.on("end", () => {
                    const raw = Buffer.concat(chunks).toString("utf-8");
                    let body: any;
                    try {
                        body = JSON.parse(raw);
                    } catch {
                        body = raw;
                    }
                    resolve({ status: res.statusCode || 0, body, headers: res.headers });
                });
            },
        );
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Timeout"));
        });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// ─── Assertion Tracker ──────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${label}`);
    } else {
        failed++;
        const msg = `  ❌ ${label}${detail ? ` — ${detail}` : ""}`;
        console.log(msg);
        failures.push(msg);
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════

async function main() {
    assertLocalhost();

    console.log("═══════════════════════════════════════════════════════════");
    console.log(" TALLY BRIDGE P3a — Real-Cloud Job Round-Trip Verification");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  MongoDB: ${MONGODB_URI}`);
    console.log(`  DB:      ${DB_NAME}`);
    console.log(`  Server:  ${BASE_URL}\n`);

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);

    // Record initial counts
    initialCounts = {
        users: await db.collection("users").countDocuments(),
        sessions: await db.collection("sessions").countDocuments(),
        tallypairingcodes: await db.collection("tallypairingcodes").countDocuments(),
        tallybridgedevices: await db.collection("tallybridgedevices").countDocuments(),
        tallysyncjobs: await db.collection("tallysyncjobs").countDocuments(),
    };

    console.log("📊 Initial Document Counts:");
    for (const [col, count] of Object.entries(initialCounts)) {
        console.log(`  ${col.padEnd(22)}: ${count}`);
    }
    console.log("");

    // ─── Step 1: Create Test Tenant Admin + Session ───────────────
    console.log("▶ STEP 1: Creating test tenant admin + session");
    const testOrgId = new ObjectId().toString();
    createdIds.orgs.push(testOrgId);

    const user = {
        _id: testOrgId as any,
        email: `tbtest_rt_${Date.now()}@test.local`,
        passwordHash: "not-a-real-hash",
        role: "Admin" as const,
        subscription_tier: "pro" as const,
        organizationId: testOrgId,
        fullName: "tbtest_Roundtrip Admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
    };
    await db.collection("users").insertOne(user);
    createdIds.users.push(testOrgId);

    const sessionId = crypto.randomUUID();
    const session = {
        _id: sessionId as any,
        userId: testOrgId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastActiveAt: new Date(),
        organizationId: testOrgId,
        role: "Admin",
    };
    await db.collection("sessions").insertOne(session);
    createdIds.sessions.push(sessionId);

    const cookie = `session_id=${sessionId}`;
    assert(true, `Test admin & session created (org: ${testOrgId})`);

    // ─── Step 2: Request Pairing Code via Cloud API ───────────────
    console.log("\n▶ STEP 2: Requesting pairing code via POST /api/tally/bridge/pairing-codes");
    const codeRes = await httpRequest("POST", "/api/tally/bridge/pairing-codes", { cookie });
    assert(codeRes.status === 201, "Pairing code request returned 201");
    const rawPairingCode: string = codeRes.body?.data?.code || "";
    assert(Boolean(rawPairingCode && rawPairingCode.length === 9), `Pairing code generated: ${rawPairingCode}`);

    // Track pairing code for cleanup
    const pcDoc = await db.collection("tallypairingcodes").findOne({ organizationId: testOrgId });
    if (pcDoc) createdIds.pairingCodes.push(pcDoc._id.toString());

    // ─── Step 3: Start Fake Tally Server ──────────────────────────
    console.log("\n▶ STEP 3: Starting local fake Tally HTTP server");
    let fakeTallyRequests = 0;
    const fakeTally = http.createServer((_req, res) => {
        fakeTallyRequests++;
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("TallyPrime Server is Running");
    });

    await new Promise<void>((resolve) => {
        fakeTally.listen(0, "127.0.0.1", () => resolve());
    });
    const fakeTallyPort = (fakeTally.address() as any).port;
    assert(fakeTallyPort > 0, `Fake Tally server running on port ${fakeTallyPort}`);

    // ─── Step 4: Import Bridge Core & Initialize Poller ───────────
    console.log("\n▶ STEP 4: Importing bridge core and pairing device");
    const corePath = path.resolve(__dirname, "../../../../tools/tally-bridge/dist/core");
    const { pairDeviceClient, PollManager, StubJobExecutor } = require(corePath);

    const tokenStore = new InMemoryTokenStore();
    const logger = new CapturingLogger();
    const configStore = new InMemoryConfigStore({
        cloudUrl: BASE_URL,
        deviceId: "",
        deviceName: "tbtest_RoundtripPC",
        tallyHost: "127.0.0.1",
        tallyPort: fakeTallyPort,
        tallyCompany: "Roundtrip Test Co",
        autoStart: true,
    });

    // Pair using the bridge core client
    const pairResult = await pairDeviceClient({
        cloudUrl: BASE_URL,
        rawCode: rawPairingCode,
        deviceName: "tbtest_RoundtripPC",
        appVersion: "0.1.0",
        tokenStore,
        logger,
    });

    assert(pairResult.success === true, "Bridge core pairDeviceClient succeeded");
    assert(Boolean(pairResult.deviceId), `Device paired with id ${pairResult.deviceId}`);
    createdIds.devices.push(pairResult.deviceId);

    // Update config store with deviceId
    const currentConfig = await configStore.getConfig();
    currentConfig.deviceId = pairResult.deviceId;
    await configStore.saveConfig(currentConfig);

    // Instantiate and start Poller
    let pollCompleteCount = 0;
    const poller = new PollManager({
        tokenStore,
        configStore,
        logger,
        executor: new StubJobExecutor(),
        appVersion: "0.1.0",
        onPollComplete: () => {
            pollCompleteCount++;
        },
    });

    poller.start();
    assert(true, "Poller started against real cloud");

    // ─── Step 5: Enqueue One Job ──────────────────────────────────
    console.log("\n▶ STEP 5: Enqueueing one job with enqueueTallyJob");
    const dedupeKey1 = `tbtest_rt1_${Date.now()}`;
    const enqueueRes1 = await enqueueTallyJob(testOrgId, {
        type: "master.ledger",
        requestXml: "<ENVELOPE>tbtest</ENVELOPE>",
        dedupeKey: dedupeKey1,
        sourceRef: { entityType: "test", entityId: "rt1" },
    });
    assert(Boolean(enqueueRes1.jobId), `Job enqueued with id ${enqueueRes1.jobId}`);
    createdIds.jobs.push(enqueueRes1.jobId);

    // ─── Step 6: Wait up to 30s & Assert Completed State in DB ─────
    console.log("\n▶ STEP 6: Waiting for bridge to claim, execute stub, and ack job");
    const jobOid1 = new ObjectId(enqueueRes1.jobId);
    let jobDoc1: any = null;
    const waitStart = Date.now();

    while (Date.now() - waitStart < 30_000) {
        jobDoc1 = await db.collection("tallysyncjobs").findOne({ _id: jobOid1 });
        if (jobDoc1 && (jobDoc1.status === "failed" || jobDoc1.status === "success")) {
            break;
        }
        await new Promise((r) => setTimeout(r, 500));
    }

    assert(jobDoc1 !== null, "Job document retrieved from MongoDB");
    assert(jobDoc1?.status === "failed", `Job status is "failed" (got: ${jobDoc1?.status})`);
    assert(jobDoc1?.attempts === 1, `Job attempts is 1 (got: ${jobDoc1?.attempts})`);
    assert(
        jobDoc1?.result?.errorCode === "EXECUTOR_NOT_IMPLEMENTED",
        `Result errorCode is EXECUTOR_NOT_IMPLEMENTED (got: ${jobDoc1?.result?.errorCode})`,
    );
    assert(
        Boolean(jobDoc1?.result?.errorMessage && jobDoc1.result.errorMessage.length > 0),
        `Result errorMessage is present ("${jobDoc1?.result?.errorMessage}")`,
    );
    assert(jobDoc1?.completedAt != null, `completedAt is set (${jobDoc1?.completedAt})`);
    assert(
        jobDoc1?.claimedByDeviceId === pairResult.deviceId,
        `claimedByDeviceId matches deviceId (${jobDoc1?.claimedByDeviceId})`,
    );

    // ─── Step 7: Check GET /api/tally/bridge/devices ──────────────
    console.log("\n▶ STEP 7: Verifying device status via GET /api/tally/bridge/devices");
    const devicesRes = await httpRequest("GET", "/api/tally/bridge/devices", { cookie });
    assert(devicesRes.status === 200, "GET /api/tally/bridge/devices returned 200");
    const deviceList = Array.isArray(devicesRes.body?.data) ? devicesRes.body.data : [];
    const pairedDev = deviceList.find((d: any) => d.id === pairResult.deviceId);

    assert(Boolean(pairedDev), `Paired device found in tenant device list (id: ${pairResult.deviceId})`);
    assert(pairedDev?.online === true, `Device online flag is true (got: ${pairedDev?.online})`);
    assert(pairedDev?.tally?.reachable === true, `Device tally.reachable is true (got: ${pairedDev?.tally?.reachable})`);

    // ─── Step 8: Stop Fake Tally & Test Second Job Stays Pending ──
    console.log("\n▶ STEP 8: Stopping fake Tally, waiting 2 poll cycles, testing job hold");
    await new Promise<void>((resolve) => {
        if (typeof (fakeTally as any).closeAllConnections === "function") {
            (fakeTally as any).closeAllConnections();
        }
        fakeTally.close(() => resolve());
    });
    console.log("  Fake Tally stopped.");

    // Wait for at least 2 poll cycles (~12 seconds) so the bridge detects Tally is unreachable
    console.log("  Waiting 12s for poller to report unreachable Tally...");
    await new Promise((r) => setTimeout(r, 12_000));

    // Verify via GET /api/tally/bridge/devices that Tally is now reported unreachable
    const devCheckUnreachable = await httpRequest("GET", "/api/tally/bridge/devices", { cookie });
    const devUnreachable = devCheckUnreachable.body?.data?.find((d: any) => d.id === pairResult.deviceId);
    assert(devUnreachable?.tally?.reachable === false, `Device reports tally.reachable=false (got: ${devUnreachable?.tally?.reachable})`);

    // Enqueue second job
    console.log("  Enqueueing second job while Tally is unreachable...");
    const dedupeKey2 = `tbtest_rt2_${Date.now()}`;
    const enqueueRes2 = await enqueueTallyJob(testOrgId, {
        type: "master.ledger",
        requestXml: "<ENVELOPE>tbtest2</ENVELOPE>",
        dedupeKey: dedupeKey2,
        sourceRef: { entityType: "test", entityId: "rt2" },
    });
    createdIds.jobs.push(enqueueRes2.jobId);
    assert(Boolean(enqueueRes2.jobId), `Second job enqueued (id: ${enqueueRes2.jobId})`);

    // Wait 15s to confirm the cloud leaves it untouched
    console.log("  Waiting 15s to verify job is NOT claimed...");
    await new Promise((r) => setTimeout(r, 15_000));

    const jobOid2 = new ObjectId(enqueueRes2.jobId);
    const jobDoc2 = await db.collection("tallysyncjobs").findOne({ _id: jobOid2 });

    assert(jobDoc2?.status === "pending", `Second job remains "pending" (got: ${jobDoc2?.status})`);
    assert(jobDoc2?.attempts === 0, `Second job attempts is 0 (got: ${jobDoc2?.attempts})`);
    assert(jobDoc2?.claimedByDeviceId == null, "Second job claimedByDeviceId is null");
    assert(jobDoc2?.leaseExpiresAt == null, "Second job leaseExpiresAt is null");

    // ─── Step 9: Privacy & Redaction Assertion ────────────────────
    console.log("\n▶ STEP 9: Checking log redaction");
    const token = await tokenStore.getToken();
    const allLogs = logger.lines.join("\n");

    assert(Boolean(token), "Token exists in TokenStore");
    assert(!allLogs.includes(token!), "Logger lines do NOT contain the device token");
    assert(!allLogs.includes("<ENVELOPE>tbtest</ENVELOPE>"), "Logger lines do NOT contain requestXml text");
    assert(!allLogs.includes(rawPairingCode), "Logger lines do NOT contain the pairing code");

    // Stop poller
    poller.stop();
    console.log("  Poller stopped.");

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log(` RESULTS: ${passed} passed, ${failed} failed`);
    console.log("═══════════════════════════════════════════════════════════");
    if (failures.length > 0) {
        console.log("\nFailures:");
        failures.forEach((f) => console.log(f));
    }
}

// ─── Cleanup ────────────────────────────────────────────────────

async function cleanup() {
    console.log("\n🧹 Cleaning up test data...");
    try {
        const db = mongoClient.db(DB_NAME);

        if (createdIds.jobs.length > 0) {
            const jobOids = createdIds.jobs
                .map((id) => {
                    try { return new ObjectId(id); } catch { return null; }
                })
                .filter(Boolean);
            const del = await db.collection("tallysyncjobs").deleteMany({ _id: { $in: jobOids } });
            console.log(`  Deleted ${del.deletedCount} jobs`);
        }

        if (createdIds.devices.length > 0) {
            const devOids = createdIds.devices
                .map((id) => {
                    try { return new ObjectId(id); } catch { return null; }
                })
                .filter(Boolean);
            const del = await db.collection("tallybridgedevices").deleteMany({ _id: { $in: devOids } });
            console.log(`  Deleted ${del.deletedCount} devices`);
        }

        if (createdIds.pairingCodes.length > 0) {
            const pcOids = createdIds.pairingCodes
                .map((id) => {
                    try { return new ObjectId(id); } catch { return null; }
                })
                .filter(Boolean);
            const del = await db.collection("tallypairingcodes").deleteMany({ _id: { $in: pcOids } });
            console.log(`  Deleted ${del.deletedCount} pairing codes`);
        }

        if (createdIds.orgs.length > 0) {
            await db.collection("tallysyncjobs").deleteMany({ organizationId: { $in: createdIds.orgs } });
            await db.collection("tallybridgedevices").deleteMany({ organizationId: { $in: createdIds.orgs } });
            await db.collection("tallypairingcodes").deleteMany({ organizationId: { $in: createdIds.orgs } });
        }

        if (createdIds.sessions.length > 0) {
            const del = await db.collection("sessions").deleteMany({ _id: { $in: createdIds.sessions as any } });
            console.log(`  Deleted ${del.deletedCount} sessions`);
        }

        if (createdIds.users.length > 0) {
            const allUserIds = [
                ...createdIds.users,
                ...createdIds.users
                    .map((id) => {
                        try { return new ObjectId(id); } catch { return null; }
                    })
                    .filter(Boolean),
            ];
            const del = await db.collection("users").deleteMany({
                $or: [
                    { _id: { $in: allUserIds as any[] } },
                    { organizationId: { $in: createdIds.orgs } },
                    { email: /tbtest_/ },
                ],
            });
            console.log(`  Deleted ${del.deletedCount} users`);
        }

        console.log("  ✅ Cleanup complete");

        // Document Counts Check (Before vs After)
        const finalCounts = {
            users: await db.collection("users").countDocuments(),
            sessions: await db.collection("sessions").countDocuments(),
            tallypairingcodes: await db.collection("tallypairingcodes").countDocuments(),
            tallybridgedevices: await db.collection("tallybridgedevices").countDocuments(),
            tallysyncjobs: await db.collection("tallysyncjobs").countDocuments(),
        };

        console.log("\n📊 DATA SAFETY — Document Counts (Before vs After):");
        let safetyPass = true;
        for (const [col, initialCount] of Object.entries(initialCounts)) {
            const finalCount = (finalCounts as any)[col];
            const match = initialCount === finalCount;
            if (!match) safetyPass = false;
            console.log(`  ${col.padEnd(22)}: initial=${initialCount}, final=${finalCount} [${match ? "OK" : "MISMATCH"}]`);
        }
        console.log(`\nDATA SAFETY CHECK: ${safetyPass ? "PASS" : "FAIL"}`);
        if (!safetyPass) {
            failed++;
            failures.push("Data safety check: collection counts did not match before and after test");
        }
    } catch (err) {
        console.error("  ⚠️ Cleanup error:", err);
    } finally {
        await mongoClient.close();
    }
}

// ─── Execution ──────────────────────────────────────────────────

main()
    .catch((err) => {
        console.error("\n💥 FATAL ERROR:", err);
    })
    .finally(async () => {
        await cleanup();
        process.exit(failed > 0 ? 1 : 0);
    });
