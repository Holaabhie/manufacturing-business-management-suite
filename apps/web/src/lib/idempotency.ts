/**
 * Idempotency Key Model — MongoDB (Native Driver)
 * ──────────────────────────────────────────────────
 * Used by Next.js API routes (which use the native MongoDB driver
 * via getDb(), not Mongoose) to store and check idempotency keys.
 *
 * This module handles:
 *   • Collection setup with TTL index
 *   • Key lookup, creation, and completion
 *   • Automatic cleanup after 24 hours
 */

import { getDb } from "@/lib/mongodb";

const COLLECTION = "idempotency_keys";
const KEY_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Ensure the idempotency_keys collection has the required indexes.
 * Called once on first use, then cached.
 */
let indexesCreated = false;
async function ensureIndexes() {
    if (indexesCreated) return;
    const db = await getDb();
    const col = db.collection(COLLECTION);

    await col.createIndex({ key: 1, userId: 1 }, { unique: true });
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    indexesCreated = true;
}

export interface IdempotencyRecord {
    key: string;
    userId: string;
    method: string;
    path: string;
    requestHash: string | null;
    statusCode: number;
    responseBody: Record<string, unknown>;
    status: "processing" | "completed";
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Find an existing idempotency key record.
 */
export async function findIdempotencyKey(
    key: string,
    userId: string,
): Promise<IdempotencyRecord | null> {
    await ensureIndexes();
    const db = await getDb();
    return db.collection(COLLECTION).findOne({ key, userId }) as Promise<IdempotencyRecord | null>;
}

/**
 * Create a new idempotency key in "processing" state.
 * Returns true if created, false if duplicate (race condition).
 */
export async function createIdempotencyKey(params: {
    key: string;
    userId: string;
    method: string;
    path: string;
    requestHash: string | null;
}): Promise<boolean> {
    await ensureIndexes();
    const db = await getDb();
    const now = new Date();

    try {
        await db.collection(COLLECTION).insertOne({
            key: params.key,
            userId: params.userId,
            method: params.method,
            path: params.path,
            requestHash: params.requestHash,
            statusCode: 0,
            responseBody: {},
            status: "processing",
            expiresAt: new Date(now.getTime() + KEY_TTL_SECONDS * 1000),
            createdAt: now,
            updatedAt: now,
        });
        return true;
    } catch (err: any) {
        if (err.code === 11000) {
            // Duplicate key — another request got there first
            return false;
        }
        throw err;
    }
}

/**
 * Mark an idempotency key as "completed" and cache the response.
 */
export async function completeIdempotencyKey(
    key: string,
    userId: string,
    statusCode: number,
    responseBody: Record<string, unknown>,
): Promise<void> {
    await ensureIndexes();
    const db = await getDb();
    await db.collection(COLLECTION).updateOne(
        { key, userId },
        {
            $set: {
                statusCode,
                responseBody,
                status: "completed",
                updatedAt: new Date(),
            },
        },
    );
}

/**
 * Delete an idempotency key (cleanup on error).
 */
export async function deleteIdempotencyKey(key: string, userId: string): Promise<void> {
    const db = await getDb();
    await db.collection(COLLECTION).deleteOne({ key, userId });
}
