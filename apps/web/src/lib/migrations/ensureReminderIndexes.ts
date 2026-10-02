/**
 * Migration: Ensure reminder_rules and reminder_logs indexes exist
 *
 * Safe to run multiple times (idempotent — createIndex is a no-op if exists).
 */
import { getDb } from "@/lib/mongodb";

let _indexesEnsured = false;

export async function ensureReminderIndexes(force: boolean = false): Promise<void> {
    if (_indexesEnsured && !force) return;

    try {
        const db = await getDb();
        const rulesCol = db.collection("reminder_rules");
        const logsCol = db.collection("reminder_logs");

        // 1. Indexes on reminder_rules
        await rulesCol.createIndex(
            { userId: 1, active: 1 },
            { name: "userId_1_active_1", background: true }
        );

        await rulesCol.createIndex(
            { userId: 1, created_at: -1 },
            { name: "userId_1_created_at_-1", background: true }
        );

        // 2. Indexes on reminder_logs
        // Compound unique index on { userId, dedupe_key } for atomic duplicate prevention
        await logsCol.createIndex(
            { userId: 1, dedupe_key: 1 },
            {
                name: "userId_1_dedupe_key_1",
                unique: true,
                background: true,
            }
        );

        await logsCol.createIndex(
            { userId: 1, scheduled_date: 1 },
            { name: "userId_1_scheduled_date_1", background: true }
        );

        await logsCol.createIndex(
            { userId: 1, order_id: 1 },
            { name: "userId_1_order_id_1", background: true }
        );

        await logsCol.createIndex(
            { userId: 1, created_at: -1 },
            { name: "userId_1_created_at_-1", background: true }
        );

        _indexesEnsured = true;
        console.log("[Index] reminder_rules and reminder_logs indexes ensured.");
    } catch (err) {
        console.error("[Index] Failed to ensure reminder indexes:", err);
    }
}
