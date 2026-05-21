/**
 * MongoDB-Backed Notification Job Queue
 * ─────────────────────────────────────────────────────────
 * Lightweight queue using the `notification_jobs` collection.
 * Supports enqueue, dequeue with locking, and retry with
 * exponential backoff + jitter.
 */

import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { DeliveryJobDoc, NotificationChannel } from "./types";
import { RETRY_BACKOFF_SECONDS, MAX_RETRY_ATTEMPTS, JITTER_FACTOR } from "./types";

/**
 * Calculate the next retry time with exponential backoff and jitter.
 */
function getNextRetryTime(attempt: number): Date {
  const idx = Math.min(attempt - 1, RETRY_BACKOFF_SECONDS.length - 1);
  const baseDelay = RETRY_BACKOFF_SECONDS[idx];
  const jitter = baseDelay * JITTER_FACTOR * (Math.random() * 2 - 1); // ±20%
  const delayMs = (baseDelay + jitter) * 1000;
  return new Date(Date.now() + delayMs);
}

/**
 * Enqueue a delivery job for async processing.
 */
export async function enqueueJob(params: {
  logId: string;
  userId: string;
  channel: NotificationChannel;
  dispatchPayload: DeliveryJobDoc["dispatchPayload"];
}): Promise<string> {
  const db = await getDb();

  const job: Omit<DeliveryJobDoc, "_id"> = {
    logId: params.logId,
    userId: params.userId,
    channel: params.channel,
    attempt: 0,
    maxAttempts: MAX_RETRY_ATTEMPTS,
    status: "pending",
    nextRetryAt: new Date(), // Immediately available
    lockedUntil: null,
    dispatchPayload: params.dispatchPayload,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("notification_jobs").insertOne(job);
  console.log(`[QUEUE] Enqueued job ${result.insertedId} for ${params.channel}`);
  return result.insertedId.toString();
}

/**
 * Dequeue and lock a batch of jobs ready for processing.
 * Uses findOneAndUpdate with $lt check to prevent double-processing.
 */
export async function dequeueJobs(
  batchSize = 10,
): Promise<DeliveryJobDoc[]> {
  const db = await getDb();
  const now = new Date();
  const lockDuration = 60_000; // 60 second lock
  const lockedUntil = new Date(now.getTime() + lockDuration);

  const jobs: DeliveryJobDoc[] = [];

  for (let i = 0; i < batchSize; i++) {
    const job = await db.collection("notification_jobs").findOneAndUpdate(
      {
        status: { $in: ["pending", "failed"] },
        nextRetryAt: { $lte: now },
        $or: [
          { lockedUntil: null },
          { lockedUntil: { $lt: now } },
        ],
        attempt: { $lt: MAX_RETRY_ATTEMPTS },
      },
      {
        $set: {
          status: "processing",
          lockedUntil,
          updatedAt: now,
        },
        $inc: { attempt: 1 },
      },
      {
        sort: { nextRetryAt: 1 },
        returnDocument: "after",
      },
    );

    if (!job) break; // No more jobs available
    jobs.push(job as unknown as DeliveryJobDoc);
  }

  return jobs;
}

/**
 * Mark a job as completed successfully.
 */
export async function completeJob(jobId: string): Promise<void> {
  const db = await getDb();
  await db.collection("notification_jobs").updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status: "completed",
        lockedUntil: null,
        updatedAt: new Date(),
      },
    },
  );
}

/**
 * Mark a job for retry with exponential backoff.
 */
export async function retryJob(jobId: string, attempt: number): Promise<void> {
  const db = await getDb();

  if (attempt >= MAX_RETRY_ATTEMPTS) {
    // Dead-letter: exhausted all retries
    await db.collection("notification_jobs").updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: "dead_letter",
          lockedUntil: null,
          updatedAt: new Date(),
        },
      },
    );
    console.log(`[QUEUE] Job ${jobId} moved to dead letter after ${attempt} attempts`);
    return;
  }

  const nextRetryAt = getNextRetryTime(attempt);
  await db.collection("notification_jobs").updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status: "failed",
        lockedUntil: null,
        nextRetryAt,
        updatedAt: new Date(),
      },
    },
  );
  console.log(
    `[QUEUE] Job ${jobId} scheduled for retry #${attempt + 1} at ${nextRetryAt.toISOString()}`
  );
}

/**
 * Get queue stats for monitoring.
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  failed: number;
  deadLetter: number;
  completed: number;
}> {
  const db = await getDb();
  const pipeline = [
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ];
  const results = await db.collection("notification_jobs").aggregate(pipeline).toArray();
  const counts: Record<string, number> = {};
  for (const r of results) {
    counts[r._id] = r.count;
  }
  return {
    pending: counts["pending"] || 0,
    processing: counts["processing"] || 0,
    failed: counts["failed"] || 0,
    deadLetter: counts["dead_letter"] || 0,
    completed: counts["completed"] || 0,
  };
}
