/**
 * DELETE /api/tally/bridge/devices/[id]
 * ─────────────────────────────────────────────────────────
 * Soft-revokes a bridge device (sets revokedAt).
 * Auth: Admin only, tenant-scoped.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export const DELETE = withRateLimit(
    withApiRoute(
        withAuth(async (
            _request: NextRequest,
            user: AuthenticatedUser,
            context: { params: Promise<{ id: string }> },
        ) => {
            const { id: deviceId } = await context.params;
            const organizationId = getDataOwnerId(user);
            const db = await getDb();
            const { ObjectId } = await import("mongodb");

            let oid;
            try {
                oid = new ObjectId(deviceId);
            } catch {
                return envelope.error("Invalid device ID", 400, "VALIDATION_ERROR");
            }

            const result = await db.collection("tallybridgedevices").findOneAndUpdate(
                {
                    _id: oid,
                    organizationId,  // Tenant isolation
                },
                { $set: { revokedAt: new Date() } },
                { returnDocument: "after" },
            );

            if (!result) {
                return envelope.error("Device not found", 404, "NOT_FOUND");
            }

            return envelope.ok({
                id: result._id.toString(),
                revokedAt: result.revokedAt,
            });
        }, { role: "Admin" }),
    ),
    { tier: "write" },
);
