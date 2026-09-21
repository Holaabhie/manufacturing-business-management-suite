/**
 * Tally Settings Integration & Bug Fix Test
 * ─────────────────────────────────────────────────────────
 * Standalone script: tests company profile Tally settings
 * persistence, validation, tenant isolation, and field preservation
 * against a running local dev server + local MongoDB.
 *
 * Run:  npx tsx src/scripts/tally-settings-test.ts
 *
 * Safety:
 * - Refuses to run unless MongoDB URI host is localhost/127.0.0.1
 * - Creates test tenants with "tbtest_" prefix
 * - Records document counts before and after; cleans up only what it created
 *
 * No new dependencies.
 */

import { MongoClient, ObjectId } from "mongodb";
import * as http from "node:http";
import * as crypto from "node:crypto";

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
    companyProfiles: [] as string[],
};

let initialCounts: Record<string, number> = {};
let mongoClient: MongoClient;

// ─── HTTP helpers ───────────────────────────────────────────────

interface HttpResult {
    status: number;
    body: any;
    headers: http.IncomingHttpHeaders;
}

function httpRequest(
    method: string,
    path: string,
    options: {
        body?: unknown;
        cookie?: string;
    } = {},
): Promise<HttpResult> {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (options.cookie) headers["Cookie"] = options.cookie;
        if (bodyStr) headers["Content-Length"] = String(Buffer.byteLength(bodyStr));

        const req = http.request(
            {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method,
                headers,
                timeout: 10000,
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

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    assertLocalhost();

    console.log("═══════════════════════════════════════════════════════════");
    console.log(" TALLY SETTINGS & PROFILE ROUTE — Integration Tests");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  MongoDB: ${MONGODB_URI}`);
    console.log(`  DB:      ${DB_NAME}`);
    console.log(`  Server:  ${BASE_URL}`);
    console.log("");

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);

    try {
        // ─── Data Safety: Record Initial Document Counts ───────────────
        initialCounts = {
            users: await db.collection("users").countDocuments(),
            sessions: await db.collection("sessions").countDocuments(),
            companyprofiles: await db.collection("companyprofiles").countDocuments(),
            tallypairingcodes: await db.collection("tallypairingcodes").countDocuments(),
            tallybridgedevices: await db.collection("tallybridgedevices").countDocuments(),
            tallysyncjobs: await db.collection("tallysyncjobs").countDocuments(),
        };

        console.log("📊 DATA SAFETY — Initial Document Counts:");
        for (const [col, count] of Object.entries(initialCounts)) {
            console.log(`  ${col.padEnd(20)}: ${count}`);
        }
        console.log("");

        // ─── Create two test tenants (A and B) + one Staff user for A ──
        const tenantAId = new ObjectId().toString();
        const tenantBId = new ObjectId().toString();
        const staffAId = new ObjectId().toString();

        const userA = {
            _id: tenantAId,
            email: `tbtest_set_a_${Date.now()}@test.local`,
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
            email: `tbtest_set_b_${Date.now()}@test.local`,
            passwordHash: "not-a-real-hash",
            role: "Admin" as const,
            subscription_tier: "pro" as const,
            organizationId: tenantBId,
            fullName: "tbtest_TenantB Admin",
            createdAt: new Date(),
            updatedAt: new Date(),
            status: "active",
        };

        const userStaffA = {
            _id: staffAId,
            email: `tbtest_set_staff_${Date.now()}@test.local`,
            passwordHash: "not-a-real-hash",
            role: "Staff" as const,
            subscription_tier: "pro" as const,
            organizationId: tenantAId,
            fullName: "tbtest_TenantA Staff",
            createdAt: new Date(),
            updatedAt: new Date(),
            status: "active",
        };

        await db.collection("users").insertMany([userA, userB, userStaffA] as any);
        createdIds.users.push(tenantAId, tenantBId, staffAId);

        // Sessions
        const sessionA = crypto.randomUUID();
        const sessionB = crypto.randomUUID();
        const sessionStaffA = crypto.randomUUID();

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
            {
                _id: sessionStaffA,
                userId: staffAId,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                lastActiveAt: new Date(),
                organizationId: tenantAId,
                role: "Staff",
            },
        ] as any);
        createdIds.sessions.push(sessionA, sessionB, sessionStaffA);

        const cookieA = `session_id=${sessionA}`;
        const cookieB = `session_id=${sessionB}`;
        const cookieStaffA = `session_id=${sessionStaffA}`;

        // Initial Company Profiles in Mongo
        await db.collection("companyprofiles").insertMany([
            {
                organizationId: tenantAId,
                company_name: "Tenant A Original Corp",
                trade_name: "Tenant A Original Corp",
                primary_phone: "9876543210",
                email: "admin@tenanta.com",
                gst_number: "27AAAAA0000A1Z5",
                pan: "AAAAA0000A",
                reg_city: "Mumbai",
                reg_state: "Maharashtra",
                bank_name: "HDFC Bank",
                account_no: "1122334455",
                ifsc: "HDFC0001234",
                upi_id: "tenanta@hdfc",
                tally_company_name: "Old Tally Name A",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                organizationId: tenantBId,
                company_name: "Tenant B Secure Ltd",
                trade_name: "Tenant B Secure Ltd",
                primary_phone: "9123456780",
                email: "admin@tenantb.com",
                tally_company_name: "Tenant B Tally Untouched",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
        createdIds.companyProfiles.push(tenantAId, tenantBId);

        // ═══════════════════════════════════════════════════════════════
        // ASSERTION 1: PUT saves tally_company_name and GET returns it
        // ═══════════════════════════════════════════════════════════════
        console.log("▶ ASSERTION 1: PUT saves tally_company_name and GET returns it");

        const putRes1 = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: { tally_company_name: "Updated Tally Company A" },
        });

        assert(putRes1.status === 200, "PUT returns 200 OK", `got ${putRes1.status}`);
        assert(
            putRes1.body?.company?.tally_company_name === "Updated Tally Company A",
            "PUT response includes updated tally_company_name",
            `got "${putRes1.body?.company?.tally_company_name}"`,
        );

        const getRes1 = await httpRequest("GET", "/api/profile/company", {
            cookie: cookieA,
        });

        assert(getRes1.status === 200, "GET returns 200 OK", `got ${getRes1.status}`);
        assert(
            getRes1.body?.company?.tally_company_name === "Updated Tally Company A",
            "GET returns persisted tally_company_name",
            `got "${getRes1.body?.company?.tally_company_name}"`,
        );

        const dbDocA1 = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            dbDocA1?.tally_company_name === "Updated Tally Company A",
            "DB directly confirms tally_company_name persisted in companyprofiles",
            `got "${dbDocA1?.tally_company_name}"`,
        );

        // ═══════════════════════════════════════════════════════════════
        // ASSERTION 2: Value is trimmed; >120 chars rejected; empty allowed
        // ═══════════════════════════════════════════════════════════════
        console.log("\n▶ ASSERTION 2: Trimming, max 120 chars validation, empty allowed");

        // 2a: Trimmed
        const putResTrim = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: { tally_company_name: "   Whitespace Trimmed Company   " },
        });
        assert(putResTrim.status === 200, "PUT trimmed name returns 200", `got ${putResTrim.status}`);
        assert(
            putResTrim.body?.company?.tally_company_name === "Whitespace Trimmed Company",
            "PUT response reflects trimmed value",
            `got "${putResTrim.body?.company?.tally_company_name}"`,
        );
        const dbDocTrim = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            dbDocTrim?.tally_company_name === "Whitespace Trimmed Company",
            "DB stores trimmed value without leading/trailing whitespace",
            `got "${dbDocTrim?.tally_company_name}"`,
        );

        // 2b: >120 chars rejected
        const tooLongName = "T".repeat(121);
        const putResLong = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: { tally_company_name: tooLongName },
        });
        assert(
            putResLong.status === 400,
            "PUT with tally_company_name > 120 chars returns 400 validation error",
            `got ${putResLong.status} (${JSON.stringify(putResLong.body)})`,
        );
        const dbDocAfterLong = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            dbDocAfterLong?.tally_company_name === "Whitespace Trimmed Company",
            "DB value was NOT modified by rejected 121-char request",
        );

        // 2c: Empty string allowed
        const putResEmpty = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: { tally_company_name: "" },
        });
        assert(putResEmpty.status === 200, "PUT with empty tally_company_name returns 200", `got ${putResEmpty.status}`);
        assert(
            putResEmpty.body?.company?.tally_company_name === "",
            "PUT response confirms empty tally_company_name allowed",
            `got "${putResEmpty.body?.company?.tally_company_name}"`,
        );
        const dbDocEmpty = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            dbDocEmpty?.tally_company_name === "",
            "DB stores empty string for cleared tally_company_name",
        );

        // ═══════════════════════════════════════════════════════════════
        // ASSERTION 3: tally_bridge_url & tally_auth_token NOT persisted/returned
        // ═══════════════════════════════════════════════════════════════
        console.log("\n▶ ASSERTION 3: tally_bridge_url and tally_auth_token not persisted or returned");

        const putResSecrets = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: {
                tally_company_name: "Safe Company Clean",
                tally_bridge_url: "http://malicious-server.example.com:9999",
                tally_auth_token: "super-secret-token-that-must-not-persist",
            },
        });

        assert(putResSecrets.status === 200, "PUT returns 200 OK", `got ${putResSecrets.status}`);
        assert(
            putResSecrets.body?.company?.tally_company_name === "Safe Company Clean",
            "PUT response has correct tally_company_name",
        );
        assert(
            putResSecrets.body?.company?.tally_bridge_url === undefined,
            "PUT response does NOT return tally_bridge_url",
            `got ${putResSecrets.body?.company?.tally_bridge_url}`,
        );
        assert(
            putResSecrets.body?.company?.tally_auth_token === undefined,
            "PUT response does NOT return tally_auth_token",
            `got ${putResSecrets.body?.company?.tally_auth_token}`,
        );

        const dbDocSecrets = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            dbDocSecrets?.tally_bridge_url !== "http://malicious-server.example.com:9999",
            "DB companyprofiles did NOT persist sent tally_bridge_url",
            `got ${dbDocSecrets?.tally_bridge_url}`,
        );
        assert(
            dbDocSecrets?.tally_auth_token !== "super-secret-token-that-must-not-persist",
            "DB companyprofiles did NOT persist sent tally_auth_token",
            `got ${dbDocSecrets?.tally_auth_token}`,
        );

        const userDocA = await db.collection("users").findOne({ _id: tenantAId as any });
        assert(
            userDocA?.company_details?.tally_bridge_url !== "http://malicious-server.example.com:9999",
            "DB users collection did NOT persist sent tally_bridge_url",
        );
        assert(
            userDocA?.company_details?.tally_auth_token !== "super-secret-token-that-must-not-persist",
            "DB users collection did NOT persist sent tally_auth_token",
        );

        // ═══════════════════════════════════════════════════════════════
        // ASSERTION 4: Tenant B's profile is unaffected by Tenant A's PUT
        // ═══════════════════════════════════════════════════════════════
        console.log("\n▶ ASSERTION 4: Tenant isolation — Tenant B profile unaffected");

        const dbDocB = await db.collection("companyprofiles").findOne({ organizationId: tenantBId });
        assert(
            dbDocB?.tally_company_name === "Tenant B Tally Untouched",
            "Tenant B tally_company_name in DB is unaffected",
            `got "${dbDocB?.tally_company_name}"`,
        );
        assert(
            dbDocB?.company_name === "Tenant B Secure Ltd",
            "Tenant B company_name in DB is unaffected",
            `got "${dbDocB?.company_name}"`,
        );

        const getResB = await httpRequest("GET", "/api/profile/company", {
            cookie: cookieB,
        });
        assert(getResB.status === 200, "Tenant B GET returns 200 OK");
        assert(
            getResB.body?.company?.tally_company_name === "Tenant B Tally Untouched",
            "Tenant B GET returns original untouched tally_company_name",
            `got "${getResB.body?.company?.tally_company_name}"`,
        );

        // ═══════════════════════════════════════════════════════════════
        // ASSERTION 5: Other profile fields stay unchanged after Tally-only PUT
        // ═══════════════════════════════════════════════════════════════
        console.log("\n▶ ASSERTION 5: Other profile fields preserved after Tally-only PUT");

        const putResTallyOnly = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: { tally_company_name: "Final Verified Tally Co" },
        });
        assert(putResTallyOnly.status === 200, "Tally-only PUT returns 200 OK");

        const dbDocCheckA = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            dbDocCheckA?.company_name === "Tenant A Original Corp",
            "company_name remained unchanged in DB",
            `got "${dbDocCheckA?.company_name}"`,
        );
        assert(
            dbDocCheckA?.primary_phone === "9876543210",
            "primary_phone remained unchanged in DB",
            `got "${dbDocCheckA?.primary_phone}"`,
        );
        assert(
            dbDocCheckA?.email === "admin@tenanta.com",
            "email remained unchanged in DB",
            `got "${dbDocCheckA?.email}"`,
        );
        assert(
            dbDocCheckA?.gst_number === "27AAAAA0000A1Z5",
            "gst_number remained unchanged in DB",
            `got "${dbDocCheckA?.gst_number}"`,
        );
        assert(
            dbDocCheckA?.reg_city === "Mumbai",
            "reg_city remained unchanged in DB",
            `got "${dbDocCheckA?.reg_city}"`,
        );
        assert(
            dbDocCheckA?.bank_name === "HDFC Bank",
            "bank_name remained unchanged in DB",
            `got "${dbDocCheckA?.bank_name}"`,
        );
        assert(
            dbDocCheckA?.account_no === "1122334455",
            "account_no remained unchanged in DB",
            `got "${dbDocCheckA?.account_no}"`,
        );

        // ═══════════════════════════════════════════════════════════════
        // REGRESSION TESTS (Part 1c): Non-Tally Profile Behavior
        // ═══════════════════════════════════════════════════════════════
        console.log("\n▶ REGRESSION TEST (i): Full-body PUT updates all non-Tally fields in DB");
        const fullPayload = {
            companyName: "Acme Precision Engineering",
            address: "Nashik, Maharashtra",
            phone: "9876500000",
            email: "contact@acmeeng.com",
            logoUrl: "https://example.com/acme-logo.png",
            gstin: "27ABCDE9999F1Z5",
            pan: "ABCDE9999F",
            bankName: "ICICI Bank",
            accountNo: "9988776655",
            ifsc: "ICIC0001234",
            upiId: "acmeeng@icici",
        };
        const putResFull = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: fullPayload,
        });
        assert(putResFull.status === 200, "Full-body PUT returns 200 OK", `got ${putResFull.status}`);
        const dbFullDoc = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(dbFullDoc?.company_name === fullPayload.companyName, "company_name updated");
        assert(dbFullDoc?.reg_city === "Nashik", "reg_city updated");
        assert(dbFullDoc?.reg_state === "Maharashtra", "reg_state updated");
        assert(dbFullDoc?.primary_phone === fullPayload.phone, "primary_phone updated");
        assert(dbFullDoc?.email === fullPayload.email, "email updated");
        assert(dbFullDoc?.logoUrl === fullPayload.logoUrl, "logoUrl updated");
        assert(dbFullDoc?.gst_number === fullPayload.gstin, "gst_number updated");
        assert(dbFullDoc?.pan === fullPayload.pan, "pan updated");
        assert(dbFullDoc?.bankName === fullPayload.bankName, "bankName updated");
        assert(dbFullDoc?.accountNo === fullPayload.accountNo, "accountNo updated");
        assert(dbFullDoc?.ifsc === fullPayload.ifsc, "ifsc updated");
        assert(dbFullDoc?.upiId === fullPayload.upiId, "upiId updated");

        console.log("\n▶ REGRESSION TEST (ii): PUT with empty string clears that field while others stay unchanged");
        const putClearPayload = {
            ...fullPayload,
            phone: "",
        };
        const putResClear = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: putClearPayload,
        });
        assert(putResClear.status === 200, "PUT clearing phone returns 200 OK", `got ${putResClear.status}`);
        const dbClearDoc = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(dbClearDoc?.primary_phone === "", "primary_phone cleared to empty string");
        assert(dbClearDoc?.email === fullPayload.email, "email stayed unchanged when phone was cleared");
        assert(dbClearDoc?.bankName === fullPayload.bankName, "bankName stayed unchanged when phone was cleared");
        assert(dbClearDoc?.company_name === fullPayload.companyName, "company_name stayed unchanged when phone was cleared");

        console.log("\n▶ REGRESSION TEST (ii-b): Full-body PUT where address and phone are null returns 200, fields become empty strings");
        const putNullPayload = {
            ...fullPayload,
            address: null,
            phone: null,
        };
        const putResNull = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: putNullPayload,
        });
        assert(putResNull.status === 200, "PUT with null address and phone returns 200 OK", `got ${putResNull.status}`);
        const dbNullDoc = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(dbNullDoc?.reg_city === "", "reg_city became empty string when address was null");
        assert(dbNullDoc?.reg_state === "", "reg_state became empty string when address was null");
        assert(dbNullDoc?.primary_phone === "", "primary_phone became empty string when phone was null");
        assert(dbNullDoc?.email === fullPayload.email, "email kept its value");
        assert(dbNullDoc?.bankName === fullPayload.bankName, "bankName kept its value");
        assert(dbNullDoc?.accountNo === fullPayload.accountNo, "accountNo kept its value");
        assert(dbNullDoc?.company_name === fullPayload.companyName, "company_name kept its value");

        console.log("\n▶ REGRESSION TEST (iii): PUT with tally_company_name absent leaves stored tally_company_name unchanged");
        const currentTallyName = dbNullDoc?.tally_company_name;
        assert(
            currentTallyName === "Final Verified Tally Co",
            "Precondition: tally_company_name exists in DB before PUT without it",
            `got "${currentTallyName}"`
        );
        const putNoTally = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: {
                companyName: "Acme Precision Engineering V2",
                address: "Nashik, Maharashtra",
                phone: "9876500001",
                email: "contact@acmeeng.com",
            },
        });
        assert(putNoTally.status === 200, "PUT without tally_company_name returns 200 OK");
        const dbNoTallyDoc = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            dbNoTallyDoc?.tally_company_name === "Final Verified Tally Co",
            "Stored tally_company_name remained untouched in DB when omitted from PUT",
            `got "${dbNoTallyDoc?.tally_company_name}"`
        );
        assert(dbNoTallyDoc?.company_name === "Acme Precision Engineering V2", "company_name updated in V2");

        console.log("\n▶ REGRESSION TEST (iv): PUT with unknown extra fields does not persist them");
        const putExtraFields = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: {
                companyName: "Acme Precision Engineering V2",
                address: "Nashik, Maharashtra",
                unknownField1: "malicious_injection",
                superAdminSecret: 12345,
            },
        });
        assert(putExtraFields.status === 200, "PUT with extra fields returns 200 OK");
        const dbExtraDoc = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(dbExtraDoc?.unknownField1 === undefined, "unknownField1 was NOT persisted in companyprofiles");
        assert(dbExtraDoc?.superAdminSecret === undefined, "superAdminSecret was NOT persisted in companyprofiles");

        console.log("\n▶ REGRESSION TEST (v): GET returns the same non-Tally field names as HEAD version of route");
        const getResShape = await httpRequest("GET", "/api/profile/company", {
            cookie: cookieA,
        });
        assert(getResShape.status === 200, "GET returns 200 OK");
        assert(getResShape.body?.company !== null, "GET response company object is present");
        const headFieldNames = [
            "companyName",
            "address",
            "phone",
            "email",
            "logoUrl",
            "gstin",
            "pan",
            "bankName",
            "accountNo",
            "ifsc",
            "upiId",
        ];
        for (const field of headFieldNames) {
            assert(
                field in getResShape.body.company,
                `GET company object contains HEAD field "${field}"`,
                `fields present: ${Object.keys(getResShape.body.company).join(", ")}`
            );
        }
        assert(
            "tally_company_name" in getResShape.body.company,
            'GET company object also contains "tally_company_name"'
        );

        // ═══════════════════════════════════════════════════════════════
        // ASSERTION 6: Staff session receives 403 Forbidden & Admin gets 200
        // ═══════════════════════════════════════════════════════════════
        console.log("\n▶ ASSERTION 6: Non-Admin (staff) session receives 403 & DB unchanged; Admin returns 200");

        // Record current DB values for tally_company_name and bank_name
        const preStaffDoc = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        const preTallyName = preStaffDoc?.tally_company_name;
        const preBankName = preStaffDoc?.bank_name || preStaffDoc?.bankName;

        const putResStaff = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieStaffA,
            body: {
                companyName: "Staff Malicious Change",
                tally_company_name: "Staff Set Attempt",
                bankName: "Staff Rogue Bank",
            },
        });

        assert(
            putResStaff.status === 403,
            "Staff PUT returns 403 Forbidden",
            `got status ${putResStaff.status} body: ${JSON.stringify(putResStaff.body)}`
        );

        const postStaffDoc = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            postStaffDoc?.tally_company_name === preTallyName,
            "DB tally_company_name unchanged after Staff PUT",
            `expected "${preTallyName}", got "${postStaffDoc?.tally_company_name}"`
        );
        assert(
            (postStaffDoc?.bank_name || postStaffDoc?.bankName) === preBankName,
            "DB bank_name unchanged after Staff PUT",
            `expected "${preBankName}", got "${postStaffDoc?.bank_name || postStaffDoc?.bankName}"`
        );

        // Admin PUT verification: Admin receives 200 OK
        const putResAdmin = await httpRequest("PUT", "/api/profile/company", {
            cookie: cookieA,
            body: {
                companyName: "Acme Precision Engineering V3",
                tally_company_name: "Admin Verified Tally Final",
            },
        });
        assert(
            putResAdmin.status === 200,
            "Admin PUT returns 200 OK",
            `got status ${putResAdmin.status} body: ${JSON.stringify(putResAdmin.body)}`
        );
        const postAdminDoc = await db.collection("companyprofiles").findOne({ organizationId: tenantAId });
        assert(
            postAdminDoc?.tally_company_name === "Admin Verified Tally Final",
            "DB tally_company_name updated by Admin PUT"
        );

    } finally {
        // ─── Cleanup ───────────────────────────────────────────────────
        console.log("\n🧹 CLEANUP: Deleting test fixtures...");

        if (createdIds.users.length > 0) {
            const res = await db.collection("users").deleteMany({
                _id: { $in: createdIds.users as any },
            });
            console.log(`  Deleted ${res.deletedCount} test users`);
        }

        if (createdIds.sessions.length > 0) {
            const res = await db.collection("sessions").deleteMany({
                _id: { $in: createdIds.sessions as any },
            });
            console.log(`  Deleted ${res.deletedCount} test sessions`);
        }

        if (createdIds.companyProfiles.length > 0) {
            const res = await db.collection("companyprofiles").deleteMany({
                organizationId: { $in: createdIds.companyProfiles },
            });
            console.log(`  Deleted ${res.deletedCount} test company profiles`);
        }

        // Final Document Counts Check
        const finalCounts = {
            users: await db.collection("users").countDocuments(),
            sessions: await db.collection("sessions").countDocuments(),
            companyprofiles: await db.collection("companyprofiles").countDocuments(),
            tallypairingcodes: await db.collection("tallypairingcodes").countDocuments(),
            tallybridgedevices: await db.collection("tallybridgedevices").countDocuments(),
            tallysyncjobs: await db.collection("tallysyncjobs").countDocuments(),
        };

        console.log("\n📊 DATA SAFETY — Final vs Initial Counts:");
        let countsMatch = true;
        for (const [col, initialCount] of Object.entries(initialCounts)) {
            const finalCount = finalCounts[col as keyof typeof finalCounts];
            const diff = finalCount - initialCount;
            const status = diff === 0 ? "✅ MATCH" : `❌ MISMATCH (${diff > 0 ? "+" : ""}${diff})`;
            if (diff !== 0) countsMatch = false;
            console.log(`  ${col.padEnd(20)}: ${initialCount} → ${finalCount}  ${status}`);
        }

        assert(countsMatch, "Data safety check: all collection counts match before and after");

        await mongoClient.close();
    }

    // ─── Summary ───────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log(` RESULTS: ${passed} passed, ${failed} failed`);
    console.log("═══════════════════════════════════════════════════════════");

    if (failed > 0) {
        console.error("\nFailed assertions:");
        for (const f of failures) console.error(f);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("Test runner crashed:", err);
    process.exit(1);
});
