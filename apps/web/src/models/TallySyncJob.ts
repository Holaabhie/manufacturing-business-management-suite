/**
 * TallySyncJob — Mongoose Model
 * ─────────────────────────────────────────────────────────
 * Queued XML import jobs for the local Tally bridge to execute.
 * Cloud builds the XML; the bridge is a dumb pipe.
 *
 * Dedupe: A partial unique index on {organizationId, dedupeKey}
 * filtered to status IN ["pending","processing"] prevents
 * duplicate active jobs but allows re-enqueue after completion.
 * Requires MongoDB 6.0+.
 */

import { Schema, model, models, type Document } from "mongoose";

export const TALLY_JOB_TYPES = [
    "master.ledger",
    "master.stock_item",
    "master.unit",
    "voucher.sales",
    "voucher.receipt",
] as const;

export type TallyJobType = (typeof TALLY_JOB_TYPES)[number];

export const TALLY_JOB_STATUSES = [
    "pending",
    "processing",
    "success",
    "failed",
] as const;

export type TallyJobStatus = (typeof TALLY_JOB_STATUSES)[number];

/** Retry backoff schedule: [30s, 2m, 10m, 1h, 6h] */
export const RETRY_BACKOFF_MS = [
    30_000,       // attempt 1 → 30s
    120_000,      // attempt 2 → 2m
    600_000,      // attempt 3 → 10m
    3_600_000,    // attempt 4 → 1h
    21_600_000,   // attempt 5 → 6h
] as const;

export interface ITallySyncJob extends Document {
    organizationId: string;
    type: TallyJobType;
    priority: number;           // masters=10, vouchers=20
    dedupeKey: string;
    requestXml: string;
    status: TallyJobStatus;
    attempts: number;
    maxAttempts: number;
    nextAttemptAt: Date;
    leaseExpiresAt?: Date;
    claimedByDeviceId?: string;
    sourceRef: {
        entityType: string;
        entityId: string;
    };
    result?: {
        tallyResponse?: string; // Truncated to 8KB
        created?: number;
        altered?: number;
        errors?: number;
        errorCode?: string;
        errorMessage?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

const TallySyncJobSchema = new Schema<ITallySyncJob>(
    {
        organizationId: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: TALLY_JOB_TYPES,
        },
        priority: { type: Number, required: true, default: 20 },
        dedupeKey: { type: String, required: true },
        requestXml: { type: String, required: true },
        status: {
            type: String,
            required: true,
            enum: TALLY_JOB_STATUSES,
            default: "pending",
        },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 5 },
        nextAttemptAt: { type: Date, required: true },
        leaseExpiresAt: { type: Date, default: null },
        claimedByDeviceId: { type: String, default: null },
        sourceRef: {
            type: new Schema(
                {
                    entityType: { type: String, required: true },
                    entityId: { type: String, required: true },
                },
                { _id: false },
            ),
            required: true,
        },
        result: {
            type: new Schema(
                {
                    tallyResponse: { type: String },
                    created: { type: Number },
                    altered: { type: Number },
                    errors: { type: Number },
                    errorCode: { type: String },
                    errorMessage: { type: String },
                },
                { _id: false },
            ),
            default: null,
        },
        completedAt: { type: Date, default: null },
    },
    { timestamps: true, suppressReservedKeysWarning: true },
);

// Claim query: tenant + pending + ready + priority + FIFO
TallySyncJobSchema.index({
    organizationId: 1,
    status: 1,
    nextAttemptAt: 1,
    priority: 1,
    createdAt: 1,
});

// Dedupe: partial unique index — only active jobs block duplicates.
// Completed (success/failed) jobs do NOT block re-enqueue.
// Requires MongoDB 6.0+ for $in in partialFilterExpression.
TallySyncJobSchema.index(
    { organizationId: 1, dedupeKey: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: { $in: ["pending", "processing"] },
        },
    },
);

export const TallySyncJob =
    models.TallySyncJob ||
    model<ITallySyncJob>("TallySyncJob", TallySyncJobSchema);
