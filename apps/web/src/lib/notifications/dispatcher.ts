/**
 * Notification Dispatcher
 * ─────────────────────────────────────────────────────────
 * Core service that receives business events, matches them
 * to active notification templates, and dispatches through
 * enabled channels via the job queue.
 *
 * Usage:
 *   import { triggerNotification } from "@/lib/notifications/dispatcher";
 *   await triggerNotification({
 *     eventType: "order_status_update",
 *     payload: { orderId, clientName, productName, newStatus },
 *     triggeredBy: userId,
 *   });
 *
 * This function is fire-and-forget safe — it never throws.
 */

import { getDb } from "@/lib/mongodb";
import { createHash } from "crypto";
import { enqueueJob } from "./queue";
import { startWorker } from "./worker";
import { renderForChannel } from "./template-renderer";
import type {
  NotificationEvent,
  NotificationChannel,
  NotificationLogDoc,
  DeliveryStatus,
} from "./types";
import { EVENT_TO_TRIGGER } from "./types";

// ── Idempotency window (5 minutes) ─────────────────────
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Compute idempotency key from event data.
 */
function computeIdempotencyKey(event: NotificationEvent): string {
  const raw = `${event.eventType}:${event.triggeredBy}:${JSON.stringify(event.payload)}`;
  return createHash("sha256").update(raw).digest("hex").substring(0, 32);
}

/**
 * Check if this notification was already dispatched recently.
 */
async function isDuplicate(
  db: Awaited<ReturnType<typeof getDb>>,
  idempotencyKey: string,
  userId: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
  const existing = await db.collection("notification_logs").findOne({
    idempotencyKey,
    userId,
    sentAt: { $gte: cutoff },
  });
  return !!existing;
}

/**
 * Main dispatcher entry point.
 * Queries active templates matching the event, creates log
 * entries, enqueues delivery jobs, and starts the worker.
 *
 * IMPORTANT: This function catches all errors internally
 * so it can never break the calling API route.
 */
export async function triggerNotification(
  event: NotificationEvent,
): Promise<{ dispatched: number; logIds: string[] }> {
  const result = { dispatched: 0, logIds: [] as string[] };

  try {
    const db = await getDb();

    // ── Idempotency check ──
    const idempotencyKey = computeIdempotencyKey(event);
    if (await isDuplicate(db, idempotencyKey, event.triggeredBy)) {
      console.log(
        `[NOTIFICATION] Duplicate event suppressed: ${event.eventType} (key: ${idempotencyKey.substring(0, 8)}…)`
      );
      return result;
    }

    // ── Map event to template trigger ──
    const triggerField = EVENT_TO_TRIGGER[event.eventType] || event.eventType;

    // ── Find matching active templates ──
    const templates = await db
      .collection("notification_templates")
      .find({
        userId: event.triggeredBy,
        trigger: triggerField,
        active: true,
      })
      .toArray();

    if (templates.length === 0) {
      console.log(
        `[NOTIFICATION] No active templates for trigger: ${triggerField}`
      );
      return result;
    }

    console.log(
      `[NOTIFICATION] Found ${templates.length} template(s) for event: ${event.eventType}`
    );

    // ── Process each template ──
    for (const template of templates) {
      // If event specifies a channel, only use that; otherwise use template channels
      const channels = event.channel
        ? [event.channel]
        : ((template.channels || []) as NotificationChannel[]);

      for (const channel of channels) {
        try {
          // Render per-channel content
          const rendered = renderForChannel(template, channel, event.payload);

          // Determine recipient
          const recipientContact = event.recipientContact || "";
          const recipientName = String(
            event.payload.clientName ||
            event.payload.client_name ||
            event.payload.itemName ||
            event.payload.item_name ||
            "Business Owner"
          );

          // Create log entry with "queued" status
          const logDoc: Omit<NotificationLogDoc, "_id"> = {
            userId: event.triggeredBy,
            templateId: template._id.toString(),
            templateName: template.name || "Unknown",
            channel,
            eventType: event.eventType,
            payload: event.payload,
            recipientContact,
            recipientName,
            renderedContent: rendered.renderedMessage,
            message: rendered.renderedMessage, // backward compat
            status: "queued" as DeliveryStatus,
            retryCount: 0,
            idempotencyKey,
            sentAt: new Date(),
            createdAt: new Date(),
          };

          const logResult = await db
            .collection("notification_logs")
            .insertOne(logDoc);
          const logId = logResult.insertedId.toString();

          // Enqueue delivery job
          await enqueueJob({
            logId,
            userId: event.triggeredBy,
            channel,
            dispatchPayload: {
              recipientContact,
              renderedContent: rendered.renderedMessage,
              templateId: template._id.toString(),
              eventType: event.eventType,
              emailSubject: rendered.renderedSubject,
              emailBody: rendered.renderedHtmlBody,
              metadata: event.metadata,
            },
          });

          result.dispatched++;
          result.logIds.push(logId);

          console.log(
            `[NOTIFICATION] Queued: ${template.name} → ${channel} (log: ${logId})`
          );
        } catch (channelError) {
          console.error(
            `[NOTIFICATION] Failed to queue ${channel} for ${template.name}:`,
            channelError instanceof Error ? channelError.message : channelError
          );

          // Still save a failed log record
          try {
            const failedLog: Omit<NotificationLogDoc, "_id"> = {
              userId: event.triggeredBy,
              templateId: template._id.toString(),
              templateName: template.name || "Unknown",
              channel,
              eventType: event.eventType,
              payload: event.payload,
              recipientContact: event.recipientContact || "",
              recipientName: "Unknown",
              renderedContent: "",
              message: "",
              status: "failed" as DeliveryStatus,
              retryCount: 0,
              error: channelError instanceof Error
                ? channelError.message
                : String(channelError),
              errorCode: "QUEUE_ERROR",
              idempotencyKey,
              sentAt: new Date(),
              createdAt: new Date(),
            };
            await db.collection("notification_logs").insertOne(failedLog);
          } catch {
            // Last resort — can't even log the failure
          }
        }
      }
    }

    // ── Start the worker (idempotent) ──
    startWorker();

  } catch (error) {
    // Top-level catch — dispatcher must never throw
    console.error(
      "[NOTIFICATION] Dispatcher error (non-fatal):",
      error instanceof Error ? error.message : error
    );
  }

  return result;
}

/**
 * Send a single notification directly (used by the /send API).
 * Loads the template, renders content, creates log, and enqueues.
 */
export async function sendNotification(params: {
  userId: string;
  templateId?: string;
  eventType: string;
  channel?: NotificationChannel;
  recipientContact: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<{ logId: string; jobId: string; status: "queued" }> {
  const db = await getDb();

  // Load template if provided
  let template: Record<string, unknown> | null = null;
  if (params.templateId) {
    const { ObjectId } = await import("mongodb");
    template = await db
      .collection("notification_templates")
      .findOne({ _id: new ObjectId(params.templateId), userId: params.userId });
  }

  // Determine channel
  const channel = params.channel ||
    ((template?.channels as NotificationChannel[] | undefined)?.[0]) ||
    "whatsapp";

  // Render content
  const rendered = template
    ? renderForChannel(template, channel, params.payload)
    : {
        renderedMessage: JSON.stringify(params.payload),
        renderedSubject: undefined,
        renderedHtmlBody: undefined,
      };

  // Compute idempotency key
  const idempotencyKey = computeIdempotencyKey({
    eventType: params.eventType,
    payload: params.payload,
    triggeredBy: params.userId,
  });

  // Create log entry
  const logDoc: Omit<NotificationLogDoc, "_id"> = {
    userId: params.userId,
    templateId: params.templateId || "",
    templateName: (template?.name as string) || "Manual Send",
    channel,
    eventType: params.eventType,
    payload: params.payload,
    recipientContact: params.recipientContact,
    recipientName: String(
      params.payload.clientName || params.payload.client_name || "Recipient"
    ),
    renderedContent: rendered.renderedMessage,
    message: rendered.renderedMessage,
    status: "queued" as DeliveryStatus,
    retryCount: 0,
    idempotencyKey,
    sentAt: new Date(),
    createdAt: new Date(),
  };

  const logResult = await db.collection("notification_logs").insertOne(logDoc);
  const logId = logResult.insertedId.toString();

  // Enqueue job
  const jobId = await enqueueJob({
    logId,
    userId: params.userId,
    channel,
    dispatchPayload: {
      recipientContact: params.recipientContact,
      renderedContent: rendered.renderedMessage,
      templateId: params.templateId || "",
      eventType: params.eventType,
      emailSubject: rendered.renderedSubject,
      emailBody: rendered.renderedHtmlBody,
      metadata: params.metadata,
    },
  });

  // Start worker
  startWorker();

  return { logId, jobId, status: "queued" };
}
