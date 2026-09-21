/**
 * Tally Bridge Integration Test
 * ─────────────────────────────────────────────────────────
 * Standalone script: tests pairing, device auth, job queue,
 * poll/ack, tenant isolation, and dedupe against a running
 * local dev server + local MongoDB.
 *
 * Run:  npx tsx src/scripts/tally-bridge-test.ts
 *
 * Safety:
 * - Refuses to run unless MongoDB URI host is localhost/127.0.0.1
 * - Creates two test tenants with "tbtest_" prefix
 * - Cleans up ALL created documents at end, even on failure
 *
 * Authentication: Creates test admin users directly in the DB
 * and creates sessions via the existing createSession() helper
 * (imported from @/lib/auth-session). Uses the session cookie
 * to authenticate admin-only endpoints.
 *
 * No new dependencies.
 */

import { MongoClient, ObjectId } from "mongodb";
import * as http from "node:http";
import * as crypto from "node:crypto";
import { enqueueTallyJob, handleExpiredLeases } from "@/services/tally/bridge/tallyBridgeService";

// ─── Config ─────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "ind_manager";
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// ─── Safety check: localhost only ───────────────────────────────

function assertLocalhost() {
    try {
        const url = new URL(MONGODB_URI);
        const host = url.hostname;
        if (host !== "localhost" && host !== "127.0.0.1") {
            console.error(`❌ SAFETY: MongoDB host is "${host}", not localhost/127.0.0.1. Refusing to run.`);
            process.exit(1);
        }
    } catch {
        // mongodb:// URIs without standard URL parsing
        if (!MONGODB_URI.includes("localhost") && !MONGODB_URI.includes("127.0.0.1")) {
            console.error(`❌ SAFETY: MongoDB URI does not contain localhost/127.0.0.1. Refusing to run.`);
            process.exit(1);
        }
    }
}

// ─── State tracking for cleanup ─────────────────────────────────

const createdIds = {
    users: [] as string[],
    sessions: [] as string[],
    pairingCodes: [] as string[],
    devices: [] as string[],
    jobs: [] as string[],
};

let initialCounts: Record<string, number> = {};

let mongoClient: MongoClient;

// ─── HTTP helpers ───────────────────────────────────────────────

interface HttpResult {
    status: number;
    body: any;
    headers: http.IncomingHttpHeaders;
    setCookie?: string;
}

function httpRequest(
    method: string,
    path: string,
    options: {
        body?: unknown;
        cookie?: string;
        bearer?: string;
    } = {},
): Promise<HttpResult> {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
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
                    try { body = JSON.parse(raw); } catch { body = raw; }
                    const setCookie = res.headers["set-cookie"]?.join("; ");
                    resolve({ status: res.statusCode || 0, body, headers: res.headers, setCookie });
                });
            },
        );
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// ─── Test framework ─────────────────────────────────────────────

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

// ─── SHA-256 ────────────────────────────────────────────────────

function sha256(s: string): string {
    return crypto.createHash("sha256").update(s, "utf-8").digest("hex");
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    assertLocalhost();

    console.log("═══════════════════════════════════════════════════════════");
    console.log(" TALLY BRIDGE — Integration Tests");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  MongoDB: ${MONGODB_URI}`);
    console.log(`  DB:      ${DB_NAME}`);
    console.log(`  Server:  ${BASE_URL}`);
    console.log("");

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);

    // Ensure indexes exist by importing models (forces Mongoose schema registration)
    // We do this via a direct ensureIndex call instead
    await db.collection("tallypairingcodes").createIndex({ codeHash: 1 }, { unique: true });
    await db.collection("tallypairingcodes").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection("tallybridgedevices").createIndex({ tokenHash: 1 }, { unique: true });
    await db.collection("tallybridgedevices").createIndex({ organizationId: 1 });
    await db.collection("tallysyncjobs").createIndex({
        organizationId: 1, status: 1, nextAttemptAt: 1, priority: 1, createdAt: 1,
    });
    await db.collection("tallysyncjobs").createIndex(
        { organizationId: 1, dedupeKey: 1 },
        { unique: true, partialFilterExpression: { status: { $in: ["pending", "processing"] } } },
    );

    // ─── Data Safety: Record Initial Document Counts ───────────────
    initialCounts = {
        tallypairingcodes: await db.collection("tallypairingcodes").countDocuments(),
        tallybridgedevices: await db.collection("tallybridgedevices").countDocuments(),
        tallysyncjobs: await db.collection("tallysyncjobs").countDocuments(),
        users: await db.collection("users").countDocuments(),
        sessions: await db.collection("sessions").countDocuments(),
    };
    console.log("📊 DATA SAFETY — Initial Document Counts:");
    for (const [col, count] of Object.entries(initialCounts)) {
        console.log(`  ${col.padEnd(20)}: ${count}`);
    }

    // ─── Create two test tenant admin users ───────────────────────
    const tenantAId = new ObjectId().toString();
    const tenantBId = new ObjectId().toString();

    const userA = {
        _id: tenantAId,
        email: `tbtest_a_${Date.now()}@test.local`,
        passwordHash: "not-a-real-hash",
        role: "Admin" as const,
        subscription_tier: "pro" as const,
        organizationId: tenantAId,
        fullName: "tbtest_TenantA Admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
    };

    const userB = {
        _id: tenantBId,
        email: `tbtest_b_${Date.now()}@test.local`,
        passwordHash: "not-a-real-hash",
        role: "Admin" as const,
        subscription_tier: "pro" as const,
        organizationId: tenantBId,
        fullName: "tbtest_TenantB Admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
    };

    await db.collection("users").insertMany([userA, userB]);
    createdIds.users.push(tenantAId, tenantBId);

    // Create sessions directly (same pattern as createSession in auth-session.ts)
    const sessionA = crypto.randomUUID();
    const sessionB = crypto.randomUUID();

    await db.collection("sessions").insertMany([
        {
            _id: sessionA,
            userId: tenantAId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            lastActiveAt: new Date(),
            organizationId: tenantAId,
            role: "Admin",
        },
        {
            _id: sessionB,
            userId: tenantBId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            lastActiveAt: new Date(),
            organizationId: tenantBId,
            role: "Admin",
        },
    ]);
    createdIds.sessions.push(sessionA, sessionB);

    const cookieA = `session_id=${sessionA}`;
    const cookieB = `session_id=${sessionB}`;

    // ═══════════════════════════════════════════════════════════════
    // TEST 1: Pairing happy path + reuse + expired
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 1: Pairing");

    // 1a: Happy path — create code
    const codeRes = await httpRequest("POST", "/api/tally/bridge/pairing-codes", {
        cookie: cookieA,
    });
    assert(codeRes.status === 201, "Create pairing code returns 201");
    assert(typeof codeRes.body?.data?.code === "string", "Code is returned as string");
    const rawCode: string = codeRes.body?.data?.code || "";
    assert(rawCode.length === 9 && rawCode[4] === "-", `Code format XXXX-XXXX: "${rawCode}"`);

    // 1b: Pair with the code
    const pairRes = await httpRequest("POST", "/api/tally/bridge/pair", {
        body: {
            code: rawCode,
            deviceName: "tbtest_Device_A1",
            platform: "win32",
            appVersion: "1.0.0",
        },
    });
    assert(pairRes.status === 201, "Pair returns 201");
    const tokenA: string = pairRes.body?.data?.token || "";
    const deviceIdA: string = pairRes.body?.data?.deviceId || "";
    assert(tokenA.startsWith("tbr_"), "Token starts with tbr_");
    assert(pairRes.body?.data?.pollIntervalSec === 5, "pollIntervalSec is 5");
    if (deviceIdA) createdIds.devices.push(deviceIdA);

    // 1c: Reuse same code fails
    const reuseRes = await httpRequest("POST", "/api/tally/bridge/pair", {
        body: {
            code: rawCode,
            deviceName: "tbtest_ReuseFail",
            platform: "win32",
            appVersion: "1.0.0",
        },
    });
    assert(reuseRes.status === 400, "Reusing code returns 400");
    assert(reuseRes.body?.error?.code === "INVALID_CODE", `Reuse error code: ${reuseRes.body?.error?.code}`);

    // 1d: Expired code — create a code then set expiresAt to the past in DB
    const expCodeRes = await httpRequest("POST", "/api/tally/bridge/pairing-codes", {
        cookie: cookieA,
    });
    const expCode: string = expCodeRes.body?.data?.code || "";
    const normalizedExpCode = expCode.replace(/-/g, "").trim().toUpperCase();
    const expCodeHash = sha256(normalizedExpCode);

    // Directly set expiresAt to the past (NOT relying on TTL deletion timing)
    await db.collection("tallypairingcodes").updateOne(
        { codeHash: expCodeHash },
        { $set: { expiresAt: new Date(Date.now() - 60000) } },
    );
    // Track for cleanup
    const expPcDoc = await db.collection("tallypairingcodes").findOne({ codeHash: expCodeHash });
    if (expPcDoc) createdIds.pairingCodes.push(expPcDoc._id.toString());

    const expiredPairRes = await httpRequest("POST", "/api/tally/bridge/pair", {
        body: {
            code: expCode,
            deviceName: "tbtest_ExpiredFail",
            platform: "win32",
            appVersion: "1.0.0",
        },
    });
    assert(expiredPairRes.status === 400, "Expired code returns 400");

    // Track the first pairing code too
    const firstPcDoc = await db.collection("tallypairingcodes").findOne({
        codeHash: sha256(rawCode.replace(/-/g, "").trim().toUpperCase()),
    });
    if (firstPcDoc) createdIds.pairingCodes.push(firstPcDoc._id.toString());

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: Wrong token + revoked token => 401 with distinct codes
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 2: Auth errors");

    // 2a: Wrong token
    const wrongTokenRes = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: "tbr_totally_invalid_token_1234567890",
        body: { tally: { reachable: true, host: "localhost", port: 9000, companies: [] } },
    });
    assert(wrongTokenRes.status === 401, `Wrong token returns 401 (got ${wrongTokenRes.status})`);
    assert(wrongTokenRes.body?.error?.code === "UNAUTHORIZED", `Wrong token code: ${wrongTokenRes.body?.error?.code}`);

    // 2b: Revoke device A then try poll
    // First, create a second device for tenant A to revoke
    const code2Res = await httpRequest("POST", "/api/tally/bridge/pairing-codes", { cookie: cookieA });
    const code2: string = code2Res.body?.data?.code || "";
    const pair2Res = await httpRequest("POST", "/api/tally/bridge/pair", {
        body: { code: code2, deviceName: "tbtest_RevokeTarget", platform: "win32", appVersion: "1.0.0" },
    });
    const tokenToRevoke: string = pair2Res.body?.data?.token || "";
    const deviceToRevoke: string = pair2Res.body?.data?.deviceId || "";
    if (deviceToRevoke) createdIds.devices.push(deviceToRevoke);

    // Track pairing code
    const pc2Doc = await db.collection("tallypairingcodes").findOne({
        codeHash: sha256(code2.replace(/-/g, "").trim().toUpperCase()),
    });
    if (pc2Doc) createdIds.pairingCodes.push(pc2Doc._id.toString());

    // Revoke via DELETE
    const revokeRes = await httpRequest("DELETE", `/api/tally/bridge/devices/${deviceToRevoke}`, {
        cookie: cookieA,
    });
    assert(revokeRes.status === 200, `Revoke returns 200 (got ${revokeRes.status})`);

    // Try polling with revoked token
    const revokedPollRes = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenToRevoke,
        body: { tally: { reachable: true, host: "localhost", port: 9000, companies: [] } },
    });
    assert(revokedPollRes.status === 401, `Revoked token returns 401 (got ${revokedPollRes.status})`);
    assert(revokedPollRes.body?.error?.code === "DEVICE_REVOKED", `Revoked code: ${revokedPollRes.body?.error?.code}`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: Tenant isolation
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 3: Tenant isolation");

    // Create a device for tenant B
    const codeBRes = await httpRequest("POST", "/api/tally/bridge/pairing-codes", { cookie: cookieB });
    const codeB: string = codeBRes.body?.data?.code || "";
    const pairBRes = await httpRequest("POST", "/api/tally/bridge/pair", {
        body: { code: codeB, deviceName: "tbtest_Device_B1", platform: "darwin", appVersion: "1.0.0" },
    });
    const tokenB: string = pairBRes.body?.data?.token || "";
    const deviceIdB: string = pairBRes.body?.data?.deviceId || "";
    if (deviceIdB) createdIds.devices.push(deviceIdB);

    const pcBDoc = await db.collection("tallypairingcodes").findOne({
        codeHash: sha256(codeB.replace(/-/g, "").trim().toUpperCase()),
    });
    if (pcBDoc) createdIds.pairingCodes.push(pcBDoc._id.toString());

    // Enqueue a job for tenant A
    const jobADoc = {
        organizationId: tenantAId,
        type: "master.ledger",
        priority: 10,
        dedupeKey: `tbtest_iso_${Date.now()}`,
        requestXml: "<ENVELOPE>test</ENVELOPE>",
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: null,
        claimedByDeviceId: null,
        sourceRef: { entityType: "test", entityId: "t1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const jobAInsert = await db.collection("tallysyncjobs").insertOne(jobADoc);
    createdIds.jobs.push(jobAInsert.insertedId.toString());

    // Tenant B polls — should NOT see tenant A's job
    const pollBRes = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenB,
        body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
    });
    assert(pollBRes.status === 200, "Tenant B poll succeeds");
    assert(pollBRes.body?.data?.jobs?.length === 0, `Tenant B sees 0 jobs (got ${pollBRes.body?.data?.jobs?.length})`);

    // Tenant A polls — should see it
    const pollARes = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenA,
        body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
    });
    assert(pollARes.status === 200, "Tenant A poll succeeds");
    assert(pollARes.body?.data?.jobs?.length === 1, `Tenant A sees 1 job (got ${pollARes.body?.data?.jobs?.length})`);
    const claimedJobId = pollARes.body?.data?.jobs?.[0]?.id;

    // Tenant B tries to ack tenant A's job — should fail 409
    if (claimedJobId) {
        const ackBRes = await httpRequest("POST", `/api/tally/bridge/jobs/${claimedJobId}/ack`, {
            bearer: tokenB,
            body: { outcome: "success" },
        });
        assert(ackBRes.status === 409, `Tenant B ack of A's job returns 409 (got ${ackBRes.status})`);
    }

    // Tenant B user cannot list/revoke tenant A's devices
    const listBRes = await httpRequest("GET", "/api/tally/bridge/devices", { cookie: cookieB });
    const deviceIdsSeenByB = (listBRes.body?.data || []).map((d: any) => d.id);
    assert(!deviceIdsSeenByB.includes(deviceIdA), "Tenant B cannot see A's devices");

    // Ack the job properly from tenant A
    if (claimedJobId) {
        const ackARes = await httpRequest("POST", `/api/tally/bridge/jobs/${claimedJobId}/ack`, {
            bearer: tokenA,
            body: { outcome: "success", created: 1, altered: 0, errors: 0 },
        });
        assert(ackARes.status === 200, "Tenant A acks own job successfully");
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 3b: Cross-tenant attack attempts
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 3b: Cross-tenant DELETE and ACK rejection");

    // 1. Tenant B admin session sends DELETE to Tenant A's device id
    const delRes = await httpRequest("DELETE", `/api/tally/bridge/devices/${deviceIdA}`, {
        cookie: cookieB,
    });
    console.log(`  Tenant B DELETE Tenant A device HTTP status: ${delRes.status}`);
    assert(delRes.status !== 200, `Tenant B DELETE of Tenant A device is not 200 (got ${delRes.status})`);

    const devADoc = await db.collection("tallybridgedevices").findOne({ _id: new ObjectId(deviceIdA) });
    assert(devADoc?.revokedAt === null || devADoc?.revokedAt === undefined, "Tenant A device revokedAt is still null in DB");

    // 2. Tenant B's bearer token acks a job id that belongs to Tenant A
    const crossAckJobDoc = {
        organizationId: tenantAId,
        type: "master.ledger",
        priority: 10,
        dedupeKey: `tbtest_cross_ack_${Date.now()}`,
        requestXml: "<ENVELOPE>cross-ack</ENVELOPE>",
        status: "processing",
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + 120000),
        claimedByDeviceId: deviceIdA,
        sourceRef: { entityType: "test", entityId: "cross1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const crossAckInsert = await db.collection("tallysyncjobs").insertOne(crossAckJobDoc);
    createdIds.jobs.push(crossAckInsert.insertedId.toString());

    const crossAckRes = await httpRequest("POST", `/api/tally/bridge/jobs/${crossAckInsert.insertedId.toString()}/ack`, {
        bearer: tokenB,
        body: { outcome: "success", created: 99 },
    });
    assert(crossAckRes.status !== 200, `Tenant B ACK of Tenant A job rejected (got ${crossAckRes.status})`);

    const crossAckJobAfter = await db.collection("tallysyncjobs").findOne({ _id: crossAckInsert.insertedId });
    assert(crossAckJobAfter?.status === "processing", "Tenant A job in DB is unchanged: status still processing");
    assert(crossAckJobAfter?.claimedByDeviceId === deviceIdA, "Tenant A job in DB is unchanged: still claimed by device A");
    assert(crossAckJobAfter?.result === null, "Tenant A job in DB is unchanged: result is null");
    assert(crossAckJobAfter?.completedAt === null, "Tenant A job in DB is unchanged: completedAt is null");

    // ═══════════════════════════════════════════════════════════════
    // TEST 4: Concurrent polls — one pending job, two polls
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 4: Concurrent poll race");

    // Create a second device for tenant A
    const code3Res = await httpRequest("POST", "/api/tally/bridge/pairing-codes", { cookie: cookieA });
    const code3: string = code3Res.body?.data?.code || "";
    const pair3Res = await httpRequest("POST", "/api/tally/bridge/pair", {
        body: { code: code3, deviceName: "tbtest_Device_A2", platform: "win32", appVersion: "1.0.0" },
    });
    const tokenA2: string = pair3Res.body?.data?.token || "";
    const deviceIdA2: string = pair3Res.body?.data?.deviceId || "";
    if (deviceIdA2) createdIds.devices.push(deviceIdA2);
    const pc3Doc = await db.collection("tallypairingcodes").findOne({
        codeHash: sha256(code3.replace(/-/g, "").trim().toUpperCase()),
    });
    if (pc3Doc) createdIds.pairingCodes.push(pc3Doc._id.toString());

    // Enqueue single job for tenant A
    const raceJobDoc = {
        organizationId: tenantAId,
        type: "voucher.sales",
        priority: 20,
        dedupeKey: `tbtest_race_${Date.now()}`,
        requestXml: "<ENVELOPE>race</ENVELOPE>",
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: null,
        claimedByDeviceId: null,
        sourceRef: { entityType: "test", entityId: "race1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const raceJobInsert = await db.collection("tallysyncjobs").insertOne(raceJobDoc);
    createdIds.jobs.push(raceJobInsert.insertedId.toString());

    // Two concurrent polls
    const [pollR1, pollR2] = await Promise.all([
        httpRequest("POST", "/api/tally/bridge/poll", {
            bearer: tokenA,
            body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
        }),
        httpRequest("POST", "/api/tally/bridge/poll", {
            bearer: tokenA2,
            body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
        }),
    ]);

    const totalClaimed = (pollR1.body?.data?.jobs?.length || 0) + (pollR2.body?.data?.jobs?.length || 0);
    assert(totalClaimed === 1, `Exactly 1 of 2 concurrent polls claims the job (got ${totalClaimed})`);

    // Ack the race job
    const raceWinner = pollR1.body?.data?.jobs?.length ? pollR1 : pollR2;
    const raceWinnerToken = pollR1.body?.data?.jobs?.length ? tokenA : tokenA2;
    const raceJobId = raceWinner.body?.data?.jobs?.[0]?.id;
    if (raceJobId) {
        await httpRequest("POST", `/api/tally/bridge/jobs/${raceJobId}/ack`, {
            bearer: raceWinnerToken,
            body: { outcome: "success" },
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 5: tally.reachable=false => nothing claimed
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 5: tally.reachable=false");

    const unreachJobDoc = {
        organizationId: tenantAId,
        type: "master.ledger",
        priority: 10,
        dedupeKey: `tbtest_unreach_${Date.now()}`,
        requestXml: "<ENVELOPE>unreach</ENVELOPE>",
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: null,
        claimedByDeviceId: null,
        sourceRef: { entityType: "test", entityId: "u1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const unreachInsert = await db.collection("tallysyncjobs").insertOne(unreachJobDoc);
    createdIds.jobs.push(unreachInsert.insertedId.toString());

    const unreachPoll = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenA,
        body: { tally: { reachable: false, host: "localhost", port: 9000, companies: [] } },
    });
    assert(unreachPoll.body?.data?.jobs?.length === 0, "reachable=false => 0 jobs claimed");

    // Verify attempts unchanged
    const unreachJobAfter = await db.collection("tallysyncjobs").findOne({ _id: unreachInsert.insertedId });
    assert(unreachJobAfter?.attempts === 0, `Attempts unchanged (${unreachJobAfter?.attempts})`);
    assert(unreachJobAfter?.status === "pending", `Status still pending (${unreachJobAfter?.status})`);

    // Clean up this job so it doesn't interfere with later tests
    await db.collection("tallysyncjobs").deleteOne({ _id: unreachInsert.insertedId });

    // ═══════════════════════════════════════════════════════════════
    // TEST 6: Lease expiry => job requeued (or failed at max)
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 6: Lease expiry");

    const leaseJobDoc = {
        organizationId: tenantAId,
        type: "master.ledger",
        priority: 10,
        dedupeKey: `tbtest_lease_${Date.now()}`,
        requestXml: "<ENVELOPE>lease</ENVELOPE>",
        status: "processing",
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: new Date(Date.now() - 10000), // Already expired
        claimedByDeviceId: deviceIdA,
        sourceRef: { entityType: "test", entityId: "l1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const leaseInsert = await db.collection("tallysyncjobs").insertOne(leaseJobDoc);
    createdIds.jobs.push(leaseInsert.insertedId.toString());

    // 6-A (HTTP, end-to-end): Poll triggers handleExpiredLeases and reclaims in same request
    const leasePollRes = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenA,
        body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
    });

    // (i) the poll response includes this job's id
    const claimedJobIds = (leasePollRes.body?.data?.jobs || []).map((j: any) => j.id);
    assert(claimedJobIds.includes(leaseInsert.insertedId.toString()), `Poll response includes reclaimed job id (${leaseInsert.insertedId.toString()})`);

    // (ii) in DB status is "processing"
    const leaseJobAfter = await db.collection("tallysyncjobs").findOne({ _id: leaseInsert.insertedId });
    assert(leaseJobAfter?.status === "processing", `In DB status is processing (got ${leaseJobAfter?.status})`);

    // (iii) attempts equals the fixture's initial attempts + 1
    assert(leaseJobAfter?.attempts === leaseJobDoc.attempts + 1, `Attempts incremented by 1 (expected ${leaseJobDoc.attempts + 1}, got ${leaseJobAfter?.attempts})`);

    // (iv) claimedByDeviceId is device A
    assert(leaseJobAfter?.claimedByDeviceId === deviceIdA, `claimedByDeviceId is device A (got ${leaseJobAfter?.claimedByDeviceId})`);

    // (v) leaseExpiresAt is in the future
    const isLeaseInFuture = leaseJobAfter?.leaseExpiresAt && new Date(leaseJobAfter.leaseExpiresAt).getTime() > Date.now();
    assert(Boolean(isLeaseInFuture), `leaseExpiresAt is in the future (${leaseJobAfter?.leaseExpiresAt})`);

    // Keep existing nextAttemptAt-within-5s assertion
    const nextAttemptDiff = Math.abs(Date.now() - new Date(leaseJobAfter?.nextAttemptAt).getTime());
    assert(nextAttemptDiff < 5000, `nextAttemptAt on requeue is approximately now (within 5s, diff: ${nextAttemptDiff}ms)`);

    // Test max attempts => failed
    await db.collection("tallysyncjobs").updateOne(
        { _id: leaseInsert.insertedId },
        {
            $set: {
                status: "processing",
                attempts: 5,
                maxAttempts: 5,
                leaseExpiresAt: new Date(Date.now() - 10000),
            },
        },
    );

    await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenA,
        body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
    });

    const leaseMaxAfter = await db.collection("tallysyncjobs").findOne({ _id: leaseInsert.insertedId });
    assert(leaseMaxAfter?.status === "failed", `Max attempts lease => failed (got ${leaseMaxAfter?.status})`);
    assert(leaseMaxAfter?.result?.errorCode === "LEASE_EXPIRED", `Error code LEASE_EXPIRED (got ${leaseMaxAfter?.result?.errorCode})`);

    // 6-B (service level, direct): test handleExpiredLeases directly in isolation
    const directLeaseDoc = {
        organizationId: tenantAId,
        type: "master.ledger",
        priority: 10,
        dedupeKey: `tbtest_leasedirect_${Date.now()}`,
        requestXml: "<ENVELOPE>leasedirect</ENVELOPE>",
        status: "processing",
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: new Date(Date.now() - 10000), // In the past
        claimedByDeviceId: deviceIdA,
        sourceRef: { entityType: "test", entityId: "ldirect1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const directInsert = await db.collection("tallysyncjobs").insertOne(directLeaseDoc);
    createdIds.jobs.push(directInsert.insertedId.toString());

    await handleExpiredLeases(tenantAId);

    const directJobAfter = await db.collection("tallysyncjobs").findOne({ _id: directInsert.insertedId });
    assert(directJobAfter?.status === "pending", `Direct handleExpiredLeases: status is pending (got ${directJobAfter?.status})`);
    assert(directJobAfter?.attempts === 1, `Direct handleExpiredLeases: attempts unchanged at 1 (got ${directJobAfter?.attempts})`);
    assert(directJobAfter?.claimedByDeviceId === null, `Direct handleExpiredLeases: claimedByDeviceId is null (got ${directJobAfter?.claimedByDeviceId})`);
    assert(directJobAfter?.leaseExpiresAt === null, `Direct handleExpiredLeases: leaseExpiresAt is null (got ${directJobAfter?.leaseExpiresAt})`);
    const directNextDiff = Math.abs(Date.now() - new Date(directJobAfter?.nextAttemptAt).getTime());
    assert(directNextDiff < 5000, `Direct handleExpiredLeases: nextAttemptAt is within 5s of now (diff: ${directNextDiff}ms)`);

    // Clean up this job so it doesn't interfere with later tests (same pattern as Test 5 line 610)
    await db.collection("tallysyncjobs").deleteOne({ _id: directInsert.insertedId });

    // ═══════════════════════════════════════════════════════════════
    // TEST 6b: Stale ack race
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 6b: Stale ack after lease expiry and reclaim");

    // In tenant A, device X claims a job
    const staleJobDoc = {
        organizationId: tenantAId,
        type: "voucher.sales",
        priority: 20,
        dedupeKey: `tbtest_staleack_${Date.now()}`,
        requestXml: "<ENVELOPE>staleack</ENVELOPE>",
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: null,
        claimedByDeviceId: null,
        sourceRef: { entityType: "test", entityId: "stale1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const staleInsert = await db.collection("tallysyncjobs").insertOne(staleJobDoc);
    createdIds.jobs.push(staleInsert.insertedId.toString());

    // Device X polls and claims the job
    const pollXRes = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenA,
        body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
    });
    const claimedByXId = pollXRes.body?.data?.jobs?.[0]?.id;
    assert(claimedByXId === staleInsert.insertedId.toString(), `Device X claims the job (got ${claimedByXId})`);

    // Set that job's leaseExpiresAt into the past directly in the DB
    await db.collection("tallysyncjobs").updateOne(
        { _id: staleInsert.insertedId },
        { $set: { leaseExpiresAt: new Date(Date.now() - 10000) } },
    );

    // Device Y (tokenA2) polls, and the job is requeued and claimed by Y
    const pollYRes = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenA2,
        body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
    });
    const claimedByYId = pollYRes.body?.data?.jobs?.[0]?.id;
    assert(claimedByYId === staleInsert.insertedId.toString(), `Device Y claims requeued job (got ${claimedByYId})`);

    // Then device X acks the job
    const staleAckRes = await httpRequest("POST", `/api/tally/bridge/jobs/${staleInsert.insertedId.toString()}/ack`, {
        bearer: tokenA,
        body: { outcome: "success", created: 1 },
    });
    assert(staleAckRes.status === 409, `Device X stale ACK returns 409 (got ${staleAckRes.status})`);

    // Assert that the job in the DB is unchanged (still claimed by Y, status processing, attempts = 2)
    const staleJobAfter = await db.collection("tallysyncjobs").findOne({ _id: staleInsert.insertedId });
    assert(staleJobAfter?.status === "processing", `Job in DB status is still processing (got ${staleJobAfter?.status})`);
    assert(staleJobAfter?.claimedByDeviceId === deviceIdA2, `Job in DB is still claimed by Device Y (${deviceIdA2}, got ${staleJobAfter?.claimedByDeviceId})`);
    assert(staleJobAfter?.attempts === 2, `Job attempts in DB is 2 (got ${staleJobAfter?.attempts})`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 7: Retryable error backoff + 5th failure => failed
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 7: Retryable error backoff");

    const retryJobDoc = {
        organizationId: tenantAId,
        type: "voucher.sales",
        priority: 20,
        dedupeKey: `tbtest_retry_${Date.now()}`,
        requestXml: "<ENVELOPE>retry</ENVELOPE>",
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: null,
        claimedByDeviceId: null,
        sourceRef: { entityType: "test", entityId: "r1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const retryInsert = await db.collection("tallysyncjobs").insertOne(retryJobDoc);
    createdIds.jobs.push(retryInsert.insertedId.toString());

    const expectedBackoffs = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];

    for (let attempt = 1; attempt <= 5; attempt++) {
        // Reset job to claimable state for this attempt
        await db.collection("tallysyncjobs").updateOne(
            { _id: retryInsert.insertedId },
            {
                $set: {
                    status: "pending",
                    nextAttemptAt: new Date(),
                    leaseExpiresAt: null,
                    claimedByDeviceId: null,
                },
            },
        );

        // Poll to claim
        const claimRes = await httpRequest("POST", "/api/tally/bridge/poll", {
            bearer: tokenA,
            body: { tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
        });
        const claimedId = claimRes.body?.data?.jobs?.[0]?.id;

        if (!claimedId) {
            assert(false, `Attempt ${attempt}: failed to claim job`);
            break;
        }

        // Ack with retryable_error
        const ackRes = await httpRequest("POST", `/api/tally/bridge/jobs/${claimedId}/ack`, {
            bearer: tokenA,
            body: { outcome: "retryable_error", errorCode: "TALLY_TIMEOUT", errorMessage: `Attempt ${attempt}` },
        });
        assert(ackRes.status === 200, `Attempt ${attempt}: ack accepted`);

        const afterAck = await db.collection("tallysyncjobs").findOne({ _id: retryInsert.insertedId });

        if (attempt < 5) {
            assert(afterAck?.status === "pending", `Attempt ${attempt}: requeued to pending (got ${afterAck?.status})`);
            // Check backoff: nextAttemptAt should be roughly now + backoff[attempt-1]
            const nextAttempt = new Date(afterAck?.nextAttemptAt).getTime();
            const expectedMin = Date.now() + expectedBackoffs[attempt - 1] - 5000; // 5s tolerance
            assert(nextAttempt > expectedMin, `Attempt ${attempt}: backoff ~${expectedBackoffs[attempt - 1] / 1000}s applied`);
        } else {
            assert(afterAck?.status === "failed", `Attempt 5: status is failed (got ${afterAck?.status})`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 8: Enqueue dedupe
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 8: Enqueue dedupe");

    const dedupeKey = `tbtest_dedupe_${Date.now()}`;

    // Insert first job
    const dedupeDoc1 = {
        organizationId: tenantAId,
        type: "master.ledger",
        priority: 10,
        dedupeKey,
        requestXml: "<ENVELOPE>dedupe1</ENVELOPE>",
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: null,
        claimedByDeviceId: null,
        sourceRef: { entityType: "test", entityId: "d1" },
        result: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
    };
    const dedupeInsert1 = await db.collection("tallysyncjobs").insertOne(dedupeDoc1);
    createdIds.jobs.push(dedupeInsert1.insertedId.toString());

    // Try inserting duplicate — should hit E11000
    let dedupeHit = false;
    try {
        await db.collection("tallysyncjobs").insertOne({
            ...dedupeDoc1,
            requestXml: "<ENVELOPE>dedupe2-should-fail</ENVELOPE>",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    } catch (err: any) {
        if (err.code === 11000) dedupeHit = true;
    }
    assert(dedupeHit, "Duplicate active enqueue hits E11000");

    // Complete the first job
    await db.collection("tallysyncjobs").updateOne(
        { _id: dedupeInsert1.insertedId },
        { $set: { status: "success", completedAt: new Date() } },
    );

    // Re-enqueue with same dedupeKey — should succeed (partial index allows it)
    const { _id: _unusedId, ...dedupeDoc1Fields } = dedupeDoc1 as any;
    const dedupeDoc3 = {
        ...dedupeDoc1Fields,
        requestXml: "<ENVELOPE>dedupe3-new</ENVELOPE>",
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const dedupeInsert3 = await db.collection("tallysyncjobs").insertOne(dedupeDoc3);
    createdIds.jobs.push(dedupeInsert3.insertedId.toString());
    assert(
        dedupeInsert3.insertedId.toString() !== dedupeInsert1.insertedId.toString(),
        "Re-enqueue after completion creates NEW job",
    );

    // TEST 12 addition: concurrent double-enqueue creates exactly one
    const concDedupeKey = `tbtest_concdedupe_${Date.now()}`;
    const concDoc = {
        organizationId: tenantAId,
        type: "master.stock_item",
        priority: 10,
        dedupeKey: concDedupeKey,
        requestXml: "<ENVELOPE>concurrent</ENVELOPE>",
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        leaseExpiresAt: null,
        claimedByDeviceId: null,
        sourceRef: { entityType: "test", entityId: "c1" },
        result: null,
        completedAt: null,
    };

    const concResults = await Promise.allSettled([
        db.collection("tallysyncjobs").insertOne({ ...concDoc, createdAt: new Date(), updatedAt: new Date() }),
        db.collection("tallysyncjobs").insertOne({ ...concDoc, createdAt: new Date(), updatedAt: new Date() }),
    ]);

    const concSuccesses = concResults.filter((r) => r.status === "fulfilled");
    const concFailures = concResults.filter((r) => r.status === "rejected");
    assert(concSuccesses.length === 1, `Concurrent double-enqueue: exactly 1 succeeds (got ${concSuccesses.length})`);
    assert(concFailures.length === 1, `Concurrent double-enqueue: exactly 1 E11000 (got ${concFailures.length})`);

    // Track the successful one for cleanup
    for (const r of concResults) {
        if (r.status === "fulfilled") {
            createdIds.jobs.push((r as PromiseFulfilledResult<any>).value.insertedId.toString());
        }
    }

    // ─── Test 8 Service-Level Dedupe Assertions ─────────────────────
    console.log("\n  Testing enqueueTallyJob service function directly:");

    // 4a. Two sequential calls with the same dedupeKey return the same job _id, and exactly 1 document exists
    const seqKey = `tbtest_svc_seq_${Date.now()}`;
    const seqRes1 = await enqueueTallyJob(tenantAId, {
        type: "master.ledger",
        dedupeKey: seqKey,
        requestXml: "<ENVELOPE>seq1</ENVELOPE>",
        sourceRef: { entityType: "test", entityId: "seq1" },
    });
    createdIds.jobs.push(seqRes1.jobId);

    const seqRes2 = await enqueueTallyJob(tenantAId, {
        type: "master.ledger",
        dedupeKey: seqKey,
        requestXml: "<ENVELOPE>seq2</ENVELOPE>",
        sourceRef: { entityType: "test", entityId: "seq2" },
    });
    assert(seqRes1.jobId === seqRes2.jobId, `Sequential enqueueTallyJob returns same _id (${seqRes1.jobId})`);
    assert(seqRes2.isExisting === true, "Sequential enqueueTallyJob second call has isExisting: true");
    const seqCount = await db.collection("tallysyncjobs").countDocuments({ organizationId: tenantAId, dedupeKey: seqKey });
    assert(seqCount === 1, `Exactly 1 document exists for sequential key (got ${seqCount})`);

    // 4b. Two concurrent calls (Promise.all) both resolve WITHOUT throwing, return the same _id, and exactly 1 document exists
    const concKey = `tbtest_svc_conc_${Date.now()}`;
    const [cRes1, cRes2] = await Promise.all([
        enqueueTallyJob(tenantAId, {
            type: "master.stock_item",
            dedupeKey: concKey,
            requestXml: "<ENVELOPE>conc1</ENVELOPE>",
            sourceRef: { entityType: "test", entityId: "conc1" },
        }),
        enqueueTallyJob(tenantAId, {
            type: "master.stock_item",
            dedupeKey: concKey,
            requestXml: "<ENVELOPE>conc2</ENVELOPE>",
            sourceRef: { entityType: "test", entityId: "conc2" },
        }),
    ]);
    createdIds.jobs.push(cRes1.jobId);
    assert(cRes1.jobId === cRes2.jobId, `Concurrent enqueueTallyJob both return same _id (${cRes1.jobId})`);
    const concCount = await db.collection("tallysyncjobs").countDocuments({ organizationId: tenantAId, dedupeKey: concKey });
    assert(concCount === 1, `Exactly 1 document exists for concurrent key (got ${concCount})`);

    // 4c. After that job is acked success, calling enqueueTallyJob again returns a DIFFERENT _id
    const pollAckJob = await httpRequest("POST", "/api/tally/bridge/poll", {
        bearer: tokenA,
        body: { maxJobs: 5, tally: { reachable: true, host: "localhost", port: 9000, companies: ["Test"] } },
    });
    const foundClaimed = pollAckJob.body?.data?.jobs?.find((j: any) => j.id === cRes1.jobId);
    if (foundClaimed) {
        const ackSuccessRes = await httpRequest("POST", `/api/tally/bridge/jobs/${cRes1.jobId}/ack`, {
            bearer: tokenA,
            body: { outcome: "success", created: 1 },
        });
        assert(ackSuccessRes.status === 200, "Ack job from concurrent enqueue as success returns 200");
    } else {
        await db.collection("tallysyncjobs").updateOne(
            { _id: new ObjectId(cRes1.jobId) },
            { $set: { status: "success", completedAt: new Date() } },
        );
    }

    const reEnqueueRes = await enqueueTallyJob(tenantAId, {
        type: "master.stock_item",
        dedupeKey: concKey,
        requestXml: "<ENVELOPE>conc-after-success</ENVELOPE>",
        sourceRef: { entityType: "test", entityId: "conc-after" },
    });
    createdIds.jobs.push(reEnqueueRes.jobId);
    assert(reEnqueueRes.jobId !== cRes1.jobId, `Calling enqueueTallyJob after success returns DIFFERENT _id (${reEnqueueRes.jobId} !== ${cRes1.jobId})`);
    assert(reEnqueueRes.isExisting === false, "enqueueTallyJob after success has isExisting: false");

    // ═══════════════════════════════════════════════════════════════
    // TEST 9: Direct Mongo query — only hashes stored
    // ═══════════════════════════════════════════════════════════════
    console.log("\n▶ TEST 9: No plaintext tokens/codes in DB");

    // Check pairing codes — no plaintext code stored
    const allPairingCodes = await db.collection("tallypairingcodes")
        .find({ organizationId: { $in: [tenantAId, tenantBId] } })
        .toArray();

    let hasPlaintextCode = false;
    for (const pc of allPairingCodes) {
        const docStr = JSON.stringify(pc);
        // codeHash should be 64 hex chars (sha256). If any field looks like an 8-char code, flag it.
        if (pc.codeHash && pc.codeHash.length === 64) continue; // That's the hash, fine
        // Check there's no 'code' field or similar
        if ((pc as any).code) {
            hasPlaintextCode = true;
        }
    }
    assert(!hasPlaintextCode, "No plaintext pairing code in tallypairingcodes");

    // Check devices — no plaintext token stored
    const allDevices = await db.collection("tallybridgedevices")
        .find({ organizationId: { $in: [tenantAId, tenantBId] } })
        .toArray();

    let hasPlaintextToken = false;
    for (const dev of allDevices) {
        if ((dev as any).token) hasPlaintextToken = true;
        if (dev.tokenHash && !dev.tokenHash.match(/^[0-9a-f]{64}$/)) hasPlaintextToken = true;
        // tokenHash should be exactly 64 hex chars
        if (dev.tokenHash && dev.tokenHash.startsWith("tbr_")) hasPlaintextToken = true;
    }
    assert(!hasPlaintextToken, "No plaintext token in tallybridgedevices");
    assert(allDevices.every((d) => d.tokenHash?.length === 64), "All tokenHash values are 64 hex chars (SHA-256)");

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
            const jobOids = createdIds.jobs.map((id) => {
                try { return new ObjectId(id); } catch { return null; }
            }).filter(Boolean);
            const jobDel = await db.collection("tallysyncjobs").deleteMany({ _id: { $in: jobOids } });
            console.log(`  Deleted ${jobDel.deletedCount} jobs`);
        }

        if (createdIds.devices.length > 0) {
            const devOids = createdIds.devices.map((id) => {
                try { return new ObjectId(id); } catch { return null; }
            }).filter(Boolean);
            const devDel = await db.collection("tallybridgedevices").deleteMany({ _id: { $in: devOids } });
            console.log(`  Deleted ${devDel.deletedCount} devices`);
        }

        if (createdIds.pairingCodes.length > 0) {
            const pcOids = createdIds.pairingCodes.map((id) => {
                try { return new ObjectId(id); } catch { return null; }
            }).filter(Boolean);
            const pcDel = await db.collection("tallypairingcodes").deleteMany({ _id: { $in: pcOids } });
            console.log(`  Deleted ${pcDel.deletedCount} pairing codes`);
        }

        // Also clean any remaining tbtest_ pairing codes/devices/jobs by org ID
        const tenantIds = createdIds.users.length >= 2
            ? [createdIds.users[0], createdIds.users[1]] // These are user IDs, not org IDs
            : [];

        // Get org IDs from the users we created
        const allUserIds = [
            ...createdIds.users,
            ...createdIds.users.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean),
        ];
        const testUsers = await db.collection("users").find({
            _id: { $in: allUserIds as any[] }
        }).toArray();

        const orgIds = [
            ...testUsers.map((u) => u.organizationId).filter(Boolean),
            ...createdIds.users,
        ];
        if (orgIds.length > 0) {
            await db.collection("tallypairingcodes").deleteMany({ organizationId: { $in: orgIds } });
            await db.collection("tallybridgedevices").deleteMany({ organizationId: { $in: orgIds } });
            await db.collection("tallysyncjobs").deleteMany({ organizationId: { $in: orgIds } });
        }

        if (createdIds.sessions.length > 0) {
            const sessDel = await db.collection("sessions").deleteMany({ _id: { $in: createdIds.sessions } });
            console.log(`  Deleted ${sessDel.deletedCount} sessions`);
        }

        if (createdIds.users.length > 0) {
            const userDel = await db.collection("users").deleteMany({ _id: { $in: allUserIds as any[] } });
            console.log(`  Deleted ${userDel.deletedCount} users`);
        }

        console.log("  ✅ Cleanup complete");

        // ─── Data Safety: Final Document Counts Verification ────────
        const finalCounts = {
            tallypairingcodes: await db.collection("tallypairingcodes").countDocuments(),
            tallybridgedevices: await db.collection("tallybridgedevices").countDocuments(),
            tallysyncjobs: await db.collection("tallysyncjobs").countDocuments(),
            users: await db.collection("users").countDocuments(),
            sessions: await db.collection("sessions").countDocuments(),
        };
        console.log("\n📊 DATA SAFETY — Document Counts (Before vs After):");
        let safetyPass = true;
        for (const [col, initialCount] of Object.entries(initialCounts)) {
            const finalCount = (finalCounts as any)[col];
            const match = initialCount === finalCount;
            if (!match) safetyPass = false;
            console.log(`  ${col.padEnd(20)}: initial=${initialCount}, final=${finalCount} [${match ? "OK" : "MISMATCH"}]`);
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

// ─── Run ────────────────────────────────────────────────────────

main()
    .catch((err) => {
        console.error("\n💥 FATAL:", err);
    })
    .finally(async () => {
        await cleanup();
        process.exit(failed > 0 ? 1 : 0);
    });
