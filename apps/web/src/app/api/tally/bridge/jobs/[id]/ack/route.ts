/**
 * POST /api/tally/bridge/jobs/[id]/ack
 * ─────────────────────────────────────────────────────────
 * Bridge device acknowledges completion of a sync job.
 * Auth: Bearer token (device token).
 *
 * One atomic findOneAndUpdate:
 *   filter { _id, organizationId (from device), status: "processing", claimedByDeviceId }
 *   no match => 409.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import {
    authenticateDeviceToken,
    ackJob,
    type AckOutcome,
} from "@/services/tally/bridge/tallyBridgeService";

const VALID_OUTCOMES: AckOutcome[] = ["success", "retryable_error", "permanent_error"];

export const POST = withRateLimit(
    withApiRoute(async (
        request: NextRequest,
        context: { params: Promise<{ id: string }> },
    ) => {
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

        const { id: jobId } = await context.params;
        const body = await request.json();

        if (!body.outcome || !VALID_OUTCOMES.includes(body.outcome)) {
            return envelope.error(
                "outcome must be one of: success, retryable_error, permanent_error",
                400,
                "VALIDATION_ERROR",
            );
        }

        const result = await ackJob(
            jobId,
            auth.organizationId,  // From authenticated device, NOT from request
            auth.deviceId,
            {
                outcome: body.outcome,
                tallyResponse: body.tallyResponse,
                created: body.created,
                altered: body.altered,
                errors: body.errors,
                errorCode: body.errorCode,
                errorMessage: body.errorMessage,
            },
        );

        if (!result.updated) {
            return envelope.error(
                "Job not found, not processing, or not claimed by this device",
                409,
                "CONFLICT",
            );
        }

        return envelope.ok({ acknowledged: true });
    }),
    { tier: "write" },
);
