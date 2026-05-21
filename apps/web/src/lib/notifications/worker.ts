/**
 * Notification Worker
 * ─────────────────────────────────────────────────────────
 * Non-blocking worker that polls the notification_jobs queue,
 * dispatches messages through channel adapters, and handles
 * retries and log updates.
 *
 * Called from the /send API — processes jobs asynchronously
 * without blocking the request.
 */

import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { dequeueJobs, completeJob, retryJob } from "./queue";
import { getAdapter } from "./channels/index";
import type { DeliveryJobDoc, DeliveryStatus } from "./types";

// ── Worker state ────────────────────────────────────────
let isRunning = false;
let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;
const POLL_INTERVAL_MS = 3_000; // Poll every 3 seconds
const BATCH_SIZE = 10;

/**
 * Start the worker if not already running.
 * This is safe to call multiple times — it's idempotent.
 */
export function startWorker(): void {
  if (isRunning) return;
  isRunning = true;
  console.log("[WORKER] Notification worker started");
  schedulePoll();
}

/**
 * Stop the worker gracefully.
 */
export function stopWorker(): void {
  isRunning = false;
  if (pollTimeoutId) {
    clearTimeout(pollTimeoutId);
    pollTimeoutId = null;
  }
  console.log("[WORKER] Notification worker stopped");
}

/**
 * Schedule the next poll cycle.
 */
function schedulePoll(): void {
  if (!isRunning) return;
  pollTimeoutId = setTimeout(async () => {
    try {
      await processQueue();
    } catch (err) {
      console.error(
        "[WORKER] Poll cycle error (non-fatal):",
        err instanceof Error ? err.message : err
      );
    }
    schedulePoll(); // Schedule next cycle
  }, POLL_INTERVAL_MS);
}

/**
 * Process a batch of pending jobs from the queue.
 */
async function processQueue(): Promise<void> {
  const jobs = await dequeueJobs(BATCH_SIZE);

  if (jobs.length === 0) return;

  console.log(`[WORKER] Processing ${jobs.length} job(s)`);

  // Process jobs concurrently (but respect per-channel limits)
  await Promise.allSettled(
    jobs.map((job) => processJob(job))
  );
}

/**
 * Process a single delivery job.
 */
async function processJob(job: DeliveryJobDoc): Promise<void> {
  const jobId = (job._id as ObjectId).toString();
  const { channel, dispatchPayload, attempt } = job;

  try {
    const adapter = getAdapter(channel);

    const result = await adapter.send({
      recipientContact: dispatchPayload.recipientContact,
      message: dispatchPayload.renderedContent,
      eventType: dispatchPayload.eventType,
      subject: dispatchPayload.emailSubject,
      htmlBody: dispatchPayload.emailBody,
      metadata: dispatchPayload.metadata,
    });

    // Update the notification_logs entry
    const db = await getDb();
    const logUpdate: Record<string, unknown> = {
      lastAttemptAt: new Date(),
      retryCount: attempt,
      provider: result.provider,
      updatedAt: new Date(),
    };

    if (result.success) {
      logUpdate.status = "sent" as DeliveryStatus;
      logUpdate.providerMessageId = result.providerMessageId;
      logUpdate.sentAt = new Date();
      logUpdate.error = undefined;
      logUpdate.errorCode = undefined;

      await db.collection("notification_logs").updateOne(
        { _id: new ObjectId(job.logId) },
        { $set: logUpdate },
      );
      await completeJob(jobId);

      console.log(
        `[WORKER] ✅ Job ${jobId} delivered via ${channel} (attempt #${attempt})`
      );
    } else {
      logUpdate.status = (result.retryable ? "retrying" : "failed") as DeliveryStatus;
      logUpdate.error = result.error;
      logUpdate.errorCode = result.errorCode;

      await db.collection("notification_logs").updateOne(
        { _id: new ObjectId(job.logId) },
        { $set: logUpdate },
      );

      if (result.retryable) {
        await retryJob(jobId, attempt);
        console.log(
          `[WORKER] ⏳ Job ${jobId} failed (retryable) — attempt #${attempt}: ${result.error}`
        );
      } else {
        // Permanent failure — mark job as dead letter
        await retryJob(jobId, job.maxAttempts); // Force dead-letter
        console.log(
          `[WORKER] ❌ Job ${jobId} permanently failed: ${result.error}`
        );
      }
    }
  } catch (err) {
    // Unexpected error during processing
    console.error(`[WORKER] ❌ Unexpected error processing job ${jobId}:`, err);

    try {
      const db = await getDb();
      await db.collection("notification_logs").updateOne(
        { _id: new ObjectId(job.logId) },
        {
          $set: {
            status: "retrying" as DeliveryStatus,
            error: err instanceof Error ? err.message : String(err),
            errorCode: "WORKER_ERROR",
            retryCount: attempt,
            lastAttemptAt: new Date(),
          },
        },
      );
      await retryJob(jobId, attempt);
    } catch {
      // Last resort — can't even update the log
      console.error(`[WORKER] Failed to update log for job ${jobId}`);
    }
  }
}
