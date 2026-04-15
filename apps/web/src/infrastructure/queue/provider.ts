/**
 * Background Job Queue — Interface
 * ─────────────────────────────────────────────────────────
 * Defines the contract for background job processing.
 * Implementations can use in-memory processing, BullMQ,
 * or cloud-native queues (SQS, Cloud Tasks).
 *
 * Usage:
 *   const jobId = await jobQueue.enqueue({
 *     type: "send-invoice-email",
 *     payload: { invoiceId: "123" },
 *     tenantId: "org-1",
 *     priority: "normal",
 *     maxRetries: 3,
 *   });
 */

export interface Job<T = unknown> {
    id: string;
    type: string;
    payload: T;
    tenantId: string;
    priority: "low" | "normal" | "high";
    scheduledAt?: Date;
    maxRetries: number;
    attempt: number;
}

export interface JobHandler<T = unknown> {
    handle(job: Job<T>): Promise<void>;
}

export interface JobQueue {
    enqueue<T>(job: Omit<Job<T>, "id" | "attempt">): Promise<string>;
    registerHandler<T>(jobType: string, handler: JobHandler<T>): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}
