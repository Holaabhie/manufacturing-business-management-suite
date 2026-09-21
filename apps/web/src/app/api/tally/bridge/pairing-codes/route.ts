/**
 * POST /api/tally/bridge/pairing-codes
 * ─────────────────────────────────────────────────────────
 * Generates a one-time pairing code for a Tally bridge device.
 * Auth: Admin only (same permission as existing Tally routes).
 * Returns the formatted code "XXXX-XXXX" once; stores only the hash.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDataOwnerId } from "@/lib/auth-session";
import { createPairingCode } from "@/services/tally/bridge/tallyBridgeService";

export const POST = withRateLimit(
    withApiRoute(
        withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
            const organizationId = getDataOwnerId(user);
            const result = await createPairingCode(
                organizationId,
                user._id.toString(),
            );

            return envelope.created({
                code: result.code,
                expiresAt: result.expiresAt.toISOString(),
            });
        }, { role: "Admin" }),
    ),
    { tier: "write" },
);
