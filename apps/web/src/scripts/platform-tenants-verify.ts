/**
 * Platform Admin Tenant Management — Verification Script (V1–V7)
 * ─────────────────────────────────────────────────────────
 * Tests:
 * - V1: Unauthenticated -> 404 (no redirect)
 * - V2: Non-allowlisted user -> 404 (no redirect)
 * - V3: Platform admin -> 200 (page loads)
 * - V4: Partial email search -> filtered results
 * - V5: Grant override -> success, tier updated, granted_by present
 * - V6: Revoke override -> success, override removed
 * - V7: Empty reason -> 400 verbatim ("Reason is required and must be at most 500 characters")
 *
 * Safety:
 * - Refuses to run unless MongoDB host is localhost / 127.0.0.1
 * - Creates temporary records with "patest_" prefix
 * - Records document counts before and after, cleans up everything
 */

import { MongoClient, ObjectId } from "mongodb";
import * as http from "node:http";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "ind_manager";
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const PLATFORM_ADMIN_EMAIL = "platformadmin@test.com";
const REGULAR_ADMIN_EMAIL = `patest_regular_${Date.now()}@test.local`;
const TARGET_TENANT_EMAIL = `patest_target_${Date.now()}@test.local`;

function assertLocalhost() {
    try {
        const url = new URL(MONGODB_URI);
        const host = url.hostname;
        if (host !== "localhost" && host !== "127.0.0.1") {
            console.error(`❌ SAFETY: MongoDB host is "${host}", not localhost/127.0.0.1.`);
            process.exit(1);
        }
    } catch {
        if (!MONGODB_URI.includes("localhost") && !MONGODB_URI.includes("127.0.0.1")) {
            console.error(`❌ SAFETY: MongoDB URI does not contain localhost/127.0.0.1.`);
            process.exit(1);
        }
    }
}

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
    } = {}
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
                path: url.pathname + url.search,
                method,
                headers,
                timeout: 30000,
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
            }
        );
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error(`Timeout after 30s on ${method} ${path}`));
        });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

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

async function main() {
    assertLocalhost();

    console.log("═══════════════════════════════════════════════════════════");
    console.log(" PLATFORM ADMIN TENANTS — Verification (V1–V7)");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  MongoDB: ${MONGODB_URI}`);
    console.log(`  DB:      ${DB_NAME}`);
    console.log(`  Server:  ${BASE_URL}`);
    console.log("");

    const mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);

    // Initial sweep of any lingering patest records
    await db.collection("users").deleteMany({
        $or: [
            { email: { $regex: "^patest_" } },
            { email: PLATFORM_ADMIN_EMAIL },
        ],
    });
    await db.collection("sessions").deleteMany({
        _id: { $regex: "^patest_" } as any,
    });

    const initialUsersCount = await db.collection("users").countDocuments();
    const initialSessionsCount = await db.collection("sessions").countDocuments();

    console.log(`  Baseline: ${initialUsersCount} users, ${initialSessionsCount} sessions`);

    const createdUserIds: string[] = [];
    const createdSessionIds: string[] = [];

    try {
        // 1. Create target tenant (starter tier, role: Admin, string _id)
        const targetTenantId = new ObjectId().toString();
        await db.collection("users").insertOne({
            _id: targetTenantId as any,
            email: TARGET_TENANT_EMAIL,
            fullName: "Target Test Tenant",
            role: "Admin",
            subscription_tier: "starter",
            createdAt: new Date(),
            updatedAt: new Date(),
            status: "active",
        });
        createdUserIds.push(targetTenantId);

        // 2. Create regular (non-allowlisted) admin user + session (string _id)
        // Note: regular admin is created BEFORE platform admin so DEV_MODE auto-login
        // cannot accidentally log in as platform admin during V1 / V2.
        const regularAdminId = new ObjectId().toString();
        const regularSessionId = "patest_session_reg_" + Date.now();
        await db.collection("users").insertOne({
            _id: regularAdminId as any,
            email: REGULAR_ADMIN_EMAIL,
            fullName: "Regular Admin",
            role: "Admin",
            subscription_tier: "starter",
            createdAt: new Date(),
            updatedAt: new Date(),
            status: "active",
        });
        createdUserIds.push(regularAdminId);

        await db.collection("sessions").insertOne({
            _id: regularSessionId as any,
            userId: regularAdminId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            role: "Admin",
        });
        createdSessionIds.push(regularSessionId);

        console.log("\n--- V1: Unauthenticated request to /platform/tenants ---");
        // No session cookie. DEV_MODE auto-logins as latest admin (regularAdmin), which is NOT on allowlist.
        // Or if DEV_MODE does not auto-login, user is null (401).
        // In both cases requirePlatformAdmin returns error, layout calls notFound() -> 404.
        const v1Res = await httpRequest("GET", "/platform/tenants");
        console.log(`  HTTP status: ${v1Res.status}, Location header: ${v1Res.headers.location || "none"}`);
        assert(
            v1Res.status === 404,
            "V1: Unauthenticated request returns HTTP 404",
            `Received: ${v1Res.status}`
        );
        assert(
            !v1Res.headers.location,
            "V1: No redirect Location header (true 404, not a 302/307 to /login)",
            `Location: ${v1Res.headers.location}`
        );

        console.log("\n--- V2: Non-allowlisted user session to /platform/tenants ---");
        const v2Res = await httpRequest("GET", "/platform/tenants", {
            cookie: `session_id=${regularSessionId}`,
        });
        console.log(`  HTTP status: ${v2Res.status}, Location header: ${v2Res.headers.location || "none"}`);
        assert(
            v2Res.status === 404,
            "V2: Non-allowlisted user returns HTTP 404",
            `Received: ${v2Res.status}`
        );
        assert(
            !v2Res.headers.location,
            "V2: No redirect Location header (true 404, page existence hidden)",
            `Location: ${v2Res.headers.location}`
        );

        // 3. Now create platform admin user + session for V3–V7
        console.log("\n--- Setting up Platform Admin for V3–V7 ---");
        const platformAdminId = new ObjectId().toString();
        const platformSessionId = "patest_session_plat_" + Date.now();
        await db.collection("users").insertOne({
            _id: platformAdminId as any,
            email: PLATFORM_ADMIN_EMAIL,
            fullName: "Platform Super Admin",
            role: "Admin",
            subscription_tier: "pro",
            createdAt: new Date(),
            updatedAt: new Date(),
            status: "active",
        });
        createdUserIds.push(platformAdminId);

        await db.collection("sessions").insertOne({
            _id: platformSessionId as any,
            userId: platformAdminId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            role: "Admin",
        });
        createdSessionIds.push(platformSessionId);

        console.log("\n--- V3: Platform admin session to /platform/tenants ---");
        const v3Res = await httpRequest("GET", "/platform/tenants", {
            cookie: `session_id=${platformSessionId}`,
        });
        console.log(`  HTTP status: ${v3Res.status}`);
        assert(
            v3Res.status === 200,
            "V3: Platform admin session returns HTTP 200",
            `Received: ${v3Res.status}`
        );
        const v3Html = typeof v3Res.body === "string" ? v3Res.body : "";
        assert(
            v3Html.includes("Platform Admin") || v3Html.includes("Tenant Management"),
            "V3: Page HTML includes 'Platform Admin' / 'Tenant Management'",
            `Snippet: ${v3Html.slice(0, 200)}`
        );

        console.log("\n--- V4: Search tenants by partial email via API ---");
        const v4Res = await httpRequest(
            "GET",
            `/api/platform/tenants?email=${encodeURIComponent(TARGET_TENANT_EMAIL.slice(0, 15))}`,
            {
                cookie: `session_id=${platformSessionId}`,
            }
        );
        assert(v4Res.status === 200, "V4: GET /api/platform/tenants returns 200");
        assert(v4Res.body?.success === true, "V4: Response has success: true");
        const found = Array.isArray(v4Res.body?.data)
            ? v4Res.body.data.find((t: any) => t.email === TARGET_TENANT_EMAIL)
            : null;
        assert(!!found, `V4: Found target tenant ${TARGET_TENANT_EMAIL} in search results`);
        assert(
            found?.subscription_tier === "starter",
            "V4: Target tenant has subscription_tier: starter"
        );
        assert(
            found?.plan_override === null,
            "V4: Target tenant initially has plan_override: null"
        );

        console.log("\n--- V7: Empty reason validation (before grant) ---");
        const v7Res = await httpRequest(
            "POST",
            `/api/platform/tenants/${targetTenantId}/override`,
            {
                cookie: `session_id=${platformSessionId}`,
                body: {
                    tier: "pro",
                    reason: "   ",
                },
            }
        );
        assert(
            v7Res.status === 400,
            "V7: Empty reason returns HTTP 400",
            `Received: ${v7Res.status}`
        );
        assert(
            v7Res.body?.error === "Reason is required and must be at most 500 characters",
            "V7: Error message matches verbatim: 'Reason is required and must be at most 500 characters'",
            `Received: ${JSON.stringify(v7Res.body)}`
        );

        console.log("\n--- V5: Grant plan override ---");
        const v5Res = await httpRequest(
            "POST",
            `/api/platform/tenants/${targetTenantId}/override`,
            {
                cookie: `session_id=${platformSessionId}`,
                body: {
                    tier: "pro",
                    reason: "VIP Partner promotion - automated test",
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                },
            }
        );
        assert(v5Res.status === 200, "V5: POST override returns HTTP 200");
        assert(v5Res.body?.success === true, "V5: Response has success: true");
        assert(
            v5Res.body?.data?.effective_tier === "pro",
            "V5: effective_tier is 'pro'"
        );
        assert(
            v5Res.body?.data?.plan_override?.tier === "pro",
            "V5: plan_override.tier is 'pro'"
        );

        // Verify with GET /api/platform/tenants
        const v5Check = await httpRequest(
            "GET",
            `/api/platform/tenants?email=${encodeURIComponent(TARGET_TENANT_EMAIL)}`,
            {
                cookie: `session_id=${platformSessionId}`,
            }
        );
        const v5Tenant = v5Check.body?.data?.[0];
        assert(
            v5Tenant?.effective_tier === "pro",
            "V5 (GET): effective_tier is 'pro'"
        );
        assert(
            v5Tenant?.plan_override?.tier === "pro",
            "V5 (GET): plan_override.tier is 'pro'"
        );
        assert(
            v5Tenant?.plan_override?.reason === "VIP Partner promotion - automated test",
            "V5 (GET): plan_override.reason matches"
        );
        assert(
            "granted_by" in v5Tenant?.plan_override,
            "V5 (GET): granted_by field is present in plan_override object"
        );

        console.log("\n--- V6: Revoke plan override ---");
        const v6Res = await httpRequest(
            "DELETE",
            `/api/platform/tenants/${targetTenantId}/override`,
            {
                cookie: `session_id=${platformSessionId}`,
            }
        );
        assert(v6Res.status === 200, "V6: DELETE override returns HTTP 200");
        assert(
            v6Res.body?.message === "Plan override removed",
            "V6: Message is 'Plan override removed'"
        );

        // Verify with GET
        const v6Check = await httpRequest(
            "GET",
            `/api/platform/tenants?email=${encodeURIComponent(TARGET_TENANT_EMAIL)}`,
            {
                cookie: `session_id=${platformSessionId}`,
            }
        );
        const v6Tenant = v6Check.body?.data?.[0];
        assert(
            v6Tenant?.plan_override === null,
            "V6 (GET): plan_override is null after revoke"
        );
        assert(
            v6Tenant?.effective_tier === "starter",
            "V6 (GET): effective_tier reverted to 'starter'"
        );

    } finally {
        console.log("\n🧹 Cleaning up test records from MongoDB...");
        await db.collection("users").deleteMany({
            _id: { $in: createdUserIds as any },
        });
        // Delete all sessions for created users, plus any patest_ sessions
        await db.collection("sessions").deleteMany({
            $or: [
                { userId: { $in: createdUserIds } },
                { _id: { $regex: "^patest_" } as any },
            ],
        });

        const finalUsersCount = await db.collection("users").countDocuments();
        const finalSessionsCount = await db.collection("sessions").countDocuments();

        console.log(`  Users count:    ${initialUsersCount} -> ${finalUsersCount}`);
        console.log(`  Sessions count: ${initialSessionsCount} -> ${finalSessionsCount}`);

        assert(
            finalUsersCount === initialUsersCount,
            "Data Safety: Users document count restored to initial baseline"
        );
        assert(
            finalSessionsCount === initialSessionsCount,
            "Data Safety: Sessions document count restored to initial baseline"
        );

        await mongoClient.close();
    }

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log(` RESULTS: ${passed} passed, ${failed} failed`);
    console.log("═══════════════════════════════════════════════════════════");

    if (failed > 0) {
        console.error("FAILURES:\n" + failures.join("\n"));
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
