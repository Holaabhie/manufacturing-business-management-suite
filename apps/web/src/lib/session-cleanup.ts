/**
 * Session Cleanup — Removes expired sessions from the database.
 *
 * Can be used as:
 * 1. A cron job API endpoint (GET /api/auth/cleanup)
 * 2. Manual trigger from admin dashboard
 *
 * Also creates MongoDB TTL indexes on first run for automatic cleanup.
 */

import { getDb } from "@/lib/mongodb";

export interface CleanupResult {
    expiredSessionsRemoved: number;
    expiredResetTokensRemoved: number;
    staleAuditLogsArchived: number;
}

/**
 * Run session cleanup — remove expired sessions and reset tokens.
 */
export async function runSessionCleanup(): Promise<CleanupResult> {
    const db = await getDb();
    const now = new Date();

    // 1. Remove expired sessions
    const sessionResult = await db
        .collection("sessions")
        .deleteMany({ expiresAt: { $lt: now } });

    // 2. Remove expired refresh tokens (sessions with expired refresh but no valid access)
    const refreshResult = await db.collection("sessions").deleteMany({
        refreshExpiresAt: { $lt: now },
    });

    // 3. Remove used/expired reset tokens
    const resetResult = await db.collection("password_reset_tokens").deleteMany({
        $or: [
            { used: true, usedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
            { expiresAt: { $lt: now } },
        ],
    });

    // 4. Ensure TTL indexes exist (idempotent)
    try {
        await db.collection("sessions").createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0, name: "sessions_ttl" }
        );
        await db.collection("password_reset_tokens").createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0, name: "reset_tokens_ttl" }
        );
    } catch {
        // Index may already exist with different options — non-critical
    }

    const totalRemoved =
        (sessionResult.deletedCount || 0) + (refreshResult.deletedCount || 0);

    return {
        expiredSessionsRemoved: totalRemoved,
        expiredResetTokensRemoved: resetResult.deletedCount || 0,
        staleAuditLogsArchived: 0,
    };
}
