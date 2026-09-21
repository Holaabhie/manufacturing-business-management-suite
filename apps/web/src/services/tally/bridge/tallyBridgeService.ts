/**
 * Tally Bridge Service — Cloud Side
 * ─────────────────────────────────────────────────────────
 * Pure business logic for device auth, job enqueue, claim,
 * and lease management. No HTTP concerns.
 *
 * Security invariants:
 * - Tokens and pairing codes are NEVER logged.
 * - All queries filter by organizationId from the
 *   authenticated device, never from request input.
 */

import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/mongodb";
import type { ITallyBridgeDevice } from "@/models/TallyBridgeDevice";
import {
    RETRY_BACKOFF_MS,
    type TallyJobType,
} from "@/models/TallySyncJob";

// ─── Constants ──────────────────────────────────────────────────

const PAIRING_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0,1,I,O
const PAIRING_CODE_LENGTH = 8;
const PAIRING_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const LEASE_DURATION_MS = 120_000; // 2 minutes
const MAX_TALLY_RESPONSE_BYTES = 8 * 1024; // 8KB

// ─── Crypto Helpers ─────────────────────────────────────────────

export function sha256(input: string): string {
    return createHash("sha256").update(input, "utf-8").digest("hex");
}

export function generatePairingCode(): string {
    const bytes = randomBytes(PAIRING_CODE_LENGTH);
    let code = "";
    for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
        code += PAIRING_CODE_CHARSET[bytes[i] % PAIRING_CODE_CHARSET.length];
    }
    return code;
}

export function normalizePairingCode(raw: string): string {
    return raw.trim().toUpperCase().replace(/[-\s]/g, "");
}

export function formatPairingCode(code: string): string {
    return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

export function generateDeviceToken(): string {
    return "tbr_" + randomBytes(32).toString("base64url");
}

// ─── Device Authentication ──────────────────────────────────────

export interface AuthenticatedDevice {
    deviceId: string;
    organizationId: string;
    device: ITallyBridgeDevice;
}

/**
 * Authenticates a device by its bearer token.
 * Returns the device and its organizationId.
 *
 * Error codes:
 * - UNAUTHORIZED: unknown or missing token
 * - DEVICE_REVOKED: token matches a revoked device
 */
export async function authenticateDeviceToken(
    bearerToken: string | null | undefined,
): Promise<AuthenticatedDevice> {
    if (!bearerToken) {
        throw { statusCode: 401, code: "UNAUTHORIZED", message: "Missing authorization token" };
    }

    const tokenHash = sha256(bearerToken);
    const db = await getDb();
    const device = await db
        .collection<ITallyBridgeDevice>("tallybridgedevices")
        .findOne({ tokenHash });

    if (!device) {
        throw { statusCode: 401, code: "UNAUTHORIZED", message: "Invalid authorization token" };
    }

    if (device.revokedAt) {
        throw { statusCode: 401, code: "DEVICE_REVOKED", message: "Device has been revoked" };
    }

    return {
        deviceId: device._id.toString(),
        organizationId: device.organizationId,
        device: device as unknown as ITallyBridgeDevice,
    };
}

// ─── Pairing ────────────────────────────────────────────────────

export interface CreatePairingCodeResult {
    code: string;          // Formatted "XXXX-XXXX"
    expiresAt: Date;
}

export async function createPairingCode(
    organizationId: string,
    userId: string,
): Promise<CreatePairingCodeResult> {
    const code = generatePairingCode();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    const db = await getDb();
    await db.collection("tallypairingcodes").insertOne({
        organizationId,
        codeHash,
        createdBy: userId,
        expiresAt,
        usedAt: null,
        failedAttempts: 0,
    });

    return { code: formatPairingCode(code), expiresAt };
}

export interface PairDeviceResult {
    token: string;         // Plaintext token, returned ONCE
    deviceId: string;
    pollIntervalSec: number;
}

export async function pairDevice(
    rawCode: string,
    deviceName: string,
    platform: string,
    appVersion: string,
): Promise<PairDeviceResult> {
    const normalized = normalizePairingCode(rawCode);
    if (normalized.length !== PAIRING_CODE_LENGTH) {
        throw { statusCode: 400, code: "VALIDATION_ERROR", message: "Invalid pairing code format" };
    }

    const codeHash = sha256(normalized);
    const db = await getDb();
    const now = new Date();

    // Atomically find unexpired, unused code and mark it used
    const result = await db.collection("tallypairingcodes").findOneAndUpdate(
        {
            codeHash,
            usedAt: null,
            expiresAt: { $gt: now },
        },
        { $set: { usedAt: now } },
        { returnDocument: "after" },
    );

    if (!result) {
        throw { statusCode: 400, code: "INVALID_CODE", message: "Invalid, expired, or already used pairing code" };
    }

    // Create device
    const token = generateDeviceToken();
    const tokenHash = sha256(token);

    const deviceDoc = {
        organizationId: result.organizationId,
        name: deviceName,
        tokenHash,
        platform,
        appVersion,
        createdAt: now,
        lastSeenAt: now,
        revokedAt: null,
        tally: {
            reachable: false,
            host: "localhost",
            port: 9000,
            companies: [],
            activeCompany: null,
            lastError: null,
        },
    };

    const insertResult = await db.collection("tallybridgedevices").insertOne(deviceDoc);

    return {
        token,  // Returned ONCE, never stored in plaintext
        deviceId: insertResult.insertedId.toString(),
        pollIntervalSec: 5,
    };
}

// ─── Lease Expiry ───────────────────────────────────────────────

export async function handleExpiredLeases(organizationId: string): Promise<void> {
    const db = await getDb();
    const now = new Date();

    // Find all processing jobs with expired leases for this tenant
    const expiredJobs = await db.collection("tallysyncjobs").find({
        organizationId,
        status: "processing",
        leaseExpiresAt: { $lt: now },
    }).toArray();

    for (const job of expiredJobs) {
        if (job.attempts < job.maxAttempts) {
            // Requeue
            await db.collection("tallysyncjobs").updateOne(
                { _id: job._id, status: "processing" },
                {
                    $set: {
                        status: "pending",
                        nextAttemptAt: now,
                        leaseExpiresAt: null,
                        claimedByDeviceId: null,
                        updatedAt: now,
                    },
                },
            );
        } else {
            // Max attempts reached
            await db.collection("tallysyncjobs").updateOne(
                { _id: job._id, status: "processing" },
                {
                    $set: {
                        status: "failed",
                        leaseExpiresAt: null,
                        claimedByDeviceId: null,
                        updatedAt: now,
                        completedAt: now,
                        result: {
                            errorCode: "LEASE_EXPIRED",
                            errorMessage: "Max attempts reached after lease expiry",
                            errors: 1,
                        },
                    },
                },
            );
        }
    }
}

// ─── Job Claiming ───────────────────────────────────────────────

export interface ClaimedJob {
    id: string;
    type: TallyJobType;
    requestXml: string;
    attempts: number;
    leaseExpiresAt: Date;
}

export async function claimJobs(
    organizationId: string,
    deviceId: string,
    maxJobs: number,
): Promise<ClaimedJob[]> {
    const db = await getDb();
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);
    const claimed: ClaimedJob[] = [];

    const claimCount = Math.min(Math.max(1, maxJobs), 5); // 1..5

    for (let i = 0; i < claimCount; i++) {
        const job = await db.collection("tallysyncjobs").findOneAndUpdate(
            {
                organizationId,
                status: "pending",
                nextAttemptAt: { $lte: now },
            },
            {
                $set: {
                    status: "processing",
                    claimedByDeviceId: deviceId,
                    leaseExpiresAt,
                    updatedAt: now,
                },
                $inc: { attempts: 1 },
            },
            {
                sort: { priority: 1, createdAt: 1 },
                returnDocument: "after",
            },
        );

        if (!job) break; // No more pending jobs

        claimed.push({
            id: job._id.toString(),
            type: job.type as TallyJobType,
            requestXml: job.requestXml,
            attempts: job.attempts,
            leaseExpiresAt,
        });
    }

    return claimed;
}

// ─── Job Acknowledgement ────────────────────────────────────────

export type AckOutcome = "success" | "retryable_error" | "permanent_error";

export interface AckPayload {
    outcome: AckOutcome;
    tallyResponse?: string;
    created?: number;
    altered?: number;
    errors?: number;
    errorCode?: string;
    errorMessage?: string;
}

export async function ackJob(
    jobId: string,
    organizationId: string,
    deviceId: string,
    payload: AckPayload,
): Promise<{ updated: boolean }> {
    const db = await getDb();
    const now = new Date();
    const { ObjectId } = await import("mongodb");

    let oid: InstanceType<typeof ObjectId>;
    try {
        oid = new ObjectId(jobId);
    } catch {
        return { updated: false };
    }

    // Truncate tallyResponse to 8KB
    const tallyResponse = payload.tallyResponse
        ? payload.tallyResponse.slice(0, MAX_TALLY_RESPONSE_BYTES)
        : undefined;

    const resultDoc = {
        ...(tallyResponse !== undefined && { tallyResponse }),
        ...(payload.created !== undefined && { created: payload.created }),
        ...(payload.altered !== undefined && { altered: payload.altered }),
        ...(payload.errors !== undefined && { errors: payload.errors }),
        ...(payload.errorCode && { errorCode: payload.errorCode }),
        ...(payload.errorMessage && { errorMessage: payload.errorMessage }),
    };

    if (payload.outcome === "success") {
        // Atomic: only if this device holds the claim and job is processing
        const result = await db.collection("tallysyncjobs").findOneAndUpdate(
            {
                _id: oid,
                organizationId,
                status: "processing",
                claimedByDeviceId: deviceId,
            },
            {
                $set: {
                    status: "success",
                    completedAt: now,
                    updatedAt: now,
                    leaseExpiresAt: null,
                    result: resultDoc,
                },
            },
        );
        return { updated: !!result };
    }

    if (payload.outcome === "permanent_error") {
        const result = await db.collection("tallysyncjobs").findOneAndUpdate(
            {
                _id: oid,
                organizationId,
                status: "processing",
                claimedByDeviceId: deviceId,
            },
            {
                $set: {
                    status: "failed",
                    completedAt: now,
                    updatedAt: now,
                    leaseExpiresAt: null,
                    claimedByDeviceId: null,
                    result: resultDoc,
                },
            },
        );
        return { updated: !!result };
    }

    // retryable_error — fetch current attempts to determine backoff
    const job = await db.collection("tallysyncjobs").findOne({
        _id: oid,
        organizationId,
        status: "processing",
        claimedByDeviceId: deviceId,
    });

    if (!job) return { updated: false };

    if (job.attempts >= job.maxAttempts) {
        // Max attempts reached → failed
        await db.collection("tallysyncjobs").findOneAndUpdate(
            {
                _id: oid,
                organizationId,
                status: "processing",
                claimedByDeviceId: deviceId,
            },
            {
                $set: {
                    status: "failed",
                    completedAt: now,
                    updatedAt: now,
                    leaseExpiresAt: null,
                    claimedByDeviceId: null,
                    result: resultDoc,
                },
            },
        );
        return { updated: true };
    }

    // Requeue with backoff
    const backoffIndex = Math.min(job.attempts - 1, RETRY_BACKOFF_MS.length - 1);
    const backoffMs = RETRY_BACKOFF_MS[Math.max(0, backoffIndex)];

    await db.collection("tallysyncjobs").findOneAndUpdate(
        {
            _id: oid,
            organizationId,
            status: "processing",
            claimedByDeviceId: deviceId,
        },
        {
            $set: {
                status: "pending",
                nextAttemptAt: new Date(now.getTime() + backoffMs),
                updatedAt: now,
                leaseExpiresAt: null,
                claimedByDeviceId: null,
                result: resultDoc,
            },
        },
    );
    return { updated: true };
}

// ─── Job Enqueue (Service Function) ─────────────────────────────

export interface EnqueueJobInput {
    type: TallyJobType;
    requestXml: string;
    dedupeKey: string;
    sourceRef: { entityType: string; entityId: string };
    priority?: number;
}

export interface EnqueueJobResult {
    jobId: string;
    isExisting: boolean;
}

/**
 * Enqueues a Tally sync job.
 * If an active (pending|processing) job with the same
 * organizationId+dedupeKey exists, returns it instead.
 * Uses try-insert / catch-E11000 pattern with the partial unique index.
 */
export async function enqueueTallyJob(
    organizationId: string,
    input: EnqueueJobInput,
): Promise<EnqueueJobResult> {
    const db = await getDb();
    const now = new Date();

    const defaultPriority = input.type.startsWith("master.") ? 10 : 20;

    const doc = {
        organizationId,
        type: input.type,
        priority: input.priority ?? defaultPriority,
        dedupeKey: input.dedupeKey,
        requestXml: input.requestXml,
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: now,
        leaseExpiresAt: null,
        claimedByDeviceId: null,
        sourceRef: input.sourceRef,
        result: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
    };

    try {
        const result = await db.collection("tallysyncjobs").insertOne(doc);
        return { jobId: result.insertedId.toString(), isExisting: false };
    } catch (err: any) {
        // E11000 duplicate key error on partial unique index
        if (err?.code === 11000) {
            const existing = await db.collection("tallysyncjobs").findOne({
                organizationId,
                dedupeKey: input.dedupeKey,
                status: { $in: ["pending", "processing"] },
            });
            if (existing) {
                return { jobId: existing._id.toString(), isExisting: true };
            }
        }
        throw err;
    }
}
