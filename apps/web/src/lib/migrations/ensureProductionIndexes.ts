/**
 * Migration: Ensure production indexes exist
 *
 * Run: npx tsx src/lib/migrations/ensureProductionIndexes.ts
 * Safe to run multiple times (idempotent — createIndex is a no-op if exists).
 */
import { getDb } from "@/lib/mongodb";

export async function ensureProductionIndexes() {
    try {
        const db = await getDb();
        const col = db.collection("productions");

        // assignedStaff index — required for staff query performance
        await col.createIndex(
            { assignedStaff: 1 },
            { name: "assignedStaff_1", background: true }
        );
        console.log("[Index] assignedStaff_1 index ensured.");

        // Compound index for common queries
        await col.createIndex(
            { userId: 1, createdAt: -1 },
            { name: "userId_createdAt", background: true }
        );
        console.log("[Index] userId_createdAt index ensured.");
    } catch (err) {
        console.error("[Index] Failed to create indexes:", err);
    }
}

// Allow running as standalone script
if (require.main === module) {
    ensureProductionIndexes()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
