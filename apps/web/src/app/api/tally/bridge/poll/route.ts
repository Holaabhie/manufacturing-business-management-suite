/**
 * POST /api/tally/bridge/poll
 * ─────────────────────────────────────────────────────────
 * Bridge device polls for pending sync jobs.
 * Auth: Bearer token (device token).
 *
 * Updates device.lastSeenAt and tally snapshot.
 * Handles expired leases, then atomically claims jobs.
 * If tally.reachable=false, returns empty jobs array.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import {
    authenticateDeviceToken,
    handleExpiredLeases,
    claimJobs,
} from "@/services/tally/bridge/tallyBridgeService";
import { getDb } from "@/lib/mongodb";

export const POST = withRateLimit(
    withApiRoute(async (request: NextRequest) => {
        // Extract bearer token
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : null;

        let auth;
        try {
            auth = await authenticateDeviceToken(token);
        } catch (err: any) {
            if (err?.statusCode && err?.code) {
                return envelope.error(err.message, err.statusCode, err.code);
            }
            throw err;
        }

        const body = await request.json();
        const { appVersion, maxJobs, tally } = body;

        // Update device snapshot
        const db = await getDb();
        const now = new Date();
        const updateFields: Record<string, unknown> = {
            lastSeenAt: now,
        };
        if (appVersion) updateFields.appVersion = appVersion;
        if (tally && typeof tally === "object") {
            // Cap companies array at 50
            const companies = Array.isArray(tally.companies)
                ? tally.companies.slice(0, 50)
                : [];
            updateFields.tally = {
                reachable: Boolean(tally.reachable),
                host: String(tally.host || "localhost"),
                port: Number(tally.port) || 9000,
                companies,
                activeCompany: tally.activeCompany || null,
                lastError: tally.lastError || null,
            };
        }

        const { ObjectId } = await import("mongodb");
        await db.collection("tallybridgedevices").updateOne(
            { _id: new ObjectId(auth.deviceId) },
            { $set: updateFields },
        );

        // If Tally not reachable, return empty — don't claim anything
        if (tally && !tally.reachable) {
            return envelope.ok({
                jobs: [],
                pollAfterSec: 5,
                serverTime: now.toISOString(),
            });
        }

        // Handle expired leases for this tenant
        await handleExpiredLeases(auth.organizationId);

        // Claim jobs
        const claimCount = Math.min(Math.max(1, Number(maxJobs) || 1), 5);
        const jobs = await claimJobs(
            auth.organizationId,
            auth.deviceId,
            claimCount,
        );

        return envelope.ok({
            jobs: jobs.map((j) => ({
                id: j.id,
                type: j.type,
                requestXml: j.requestXml,
                attempts: j.attempts,
                leaseExpiresAt: j.leaseExpiresAt.toISOString(),
            })),
            pollAfterSec: 5,
            serverTime: now.toISOString(),
        });
    }),
    {
        tier: {
            maxRequests: 120,
            windowMs: 60_000,
            identifyBy: "ip",
        },
    },
);
