/**
 * GET /api/tally/bridge/devices
 * ─────────────────────────────────────────────────────────
 * Lists all paired bridge devices for the current tenant.
 * Auth: Admin only.
 * NEVER returns tokenHash.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export const GET = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
            const organizationId = getDataOwnerId(user);
            const db = await getDb();

            const devices = await db
                .collection("tallybridgedevices")
                .find(
                    { organizationId },
                    {
                        projection: {
                            tokenHash: 0,  // NEVER expose
                        },
                    },
                )
                .sort({ createdAt: -1 })
                .toArray();

            const now = Date.now();
            const result = devices.map((d) => ({
                id: d._id.toString(),
                name: d.name,
                platform: d.platform,
                appVersion: d.appVersion,
                lastSeenAt: d.lastSeenAt,
                online: d.lastSeenAt
                    ? now - new Date(d.lastSeenAt).getTime() < 60_000
                    : false,
                tally: d.tally,
                revokedAt: d.revokedAt,
                createdAt: d.createdAt,
            }));

            return envelope.ok(result);
        }, { role: "Admin" }),
    ),
    { tier: "read" },
);
