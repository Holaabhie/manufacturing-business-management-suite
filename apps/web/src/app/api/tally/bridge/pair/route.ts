/**
 * POST /api/tally/bridge/pair
 * ─────────────────────────────────────────────────────────
 * Unauthenticated endpoint for a bridge device to pair using a code.
 * Rate limited per-IP (auth tier: 10 req/60s).
 * Returns the device token ONCE.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { pairDevice } from "@/services/tally/bridge/tallyBridgeService";

export const POST = withRateLimit(
    withApiRoute(async (request: NextRequest) => {
        const body = await request.json();
        const { code, deviceName, platform, appVersion } = body;

        if (!code || typeof code !== "string") {
            return envelope.error("code is required", 400, "VALIDATION_ERROR");
        }
        if (!deviceName || typeof deviceName !== "string") {
            return envelope.error("deviceName is required", 400, "VALIDATION_ERROR");
        }
        if (!platform || typeof platform !== "string") {
            return envelope.error("platform is required", 400, "VALIDATION_ERROR");
        }
        if (!appVersion || typeof appVersion !== "string") {
            return envelope.error("appVersion is required", 400, "VALIDATION_ERROR");
        }

        try {
            const result = await pairDevice(code, deviceName, platform, appVersion);
            return envelope.created({
                token: result.token,
                deviceId: result.deviceId,
                pollIntervalSec: result.pollIntervalSec,
            });
        } catch (err: unknown) {
            const bridgeErr = err as { statusCode?: number; code?: string; message: string };
            if (bridgeErr?.statusCode && bridgeErr?.code) {
                return envelope.error(bridgeErr.message, bridgeErr.statusCode, bridgeErr.code);
            }
            throw err;
        }
    }),
    { tier: "auth" },
);
