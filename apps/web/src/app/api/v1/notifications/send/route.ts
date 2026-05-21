/**
 * Send Notification API — /api/v1/notifications/send
 * ─────────────────────────────────────────────────────────
 * Accepts a notification request, validates input, creates
 * a log entry, enqueues for async delivery, and returns
 * immediately with a job ID.
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getDataOwnerId } from "@/lib/auth-session";
import { sendNotification } from "@/lib/notifications/dispatcher";
import type { NotificationChannel } from "@/lib/notifications/types";

const VALID_CHANNELS: NotificationChannel[] = ["whatsapp", "telegram", "email", "sms"];

export const POST = withRateLimit(
  withApiRoute(
    withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
      const body = await request.json();
      const userId = getDataOwnerId(user);

      // ── Validate required fields ──
      if (!body.eventType) {
        return envelope.error("eventType is required", 400, "VALIDATION_ERROR");
      }
      if (!body.recipientContact) {
        return envelope.error("recipientContact is required", 400, "VALIDATION_ERROR");
      }
      if (!body.payload || typeof body.payload !== "object") {
        return envelope.error("payload must be an object", 400, "VALIDATION_ERROR");
      }

      // Validate channel if provided
      if (body.channel && !VALID_CHANNELS.includes(body.channel)) {
        return envelope.error(
          `Invalid channel. Must be one of: ${VALID_CHANNELS.join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );
      }

      // ── Send notification (async) ──
      const result = await sendNotification({
        userId,
        templateId: body.templateId,
        eventType: body.eventType,
        channel: body.channel,
        recipientContact: body.recipientContact,
        payload: body.payload,
        metadata: body.metadata,
      });

      return envelope.created({
        jobId: result.jobId,
        logId: result.logId,
        status: result.status,
        message: "Notification queued for delivery",
      });
    }),
  ),
  { tier: "write" },
);
