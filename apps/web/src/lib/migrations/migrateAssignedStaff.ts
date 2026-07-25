/**
 * Migration: Fix assignedStaff fields containing string IDs → ObjectId
 *
 * Run: npx tsx src/lib/migrations/migrateAssignedStaff.ts
 * Safe to run multiple times (idempotent).
 */
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function migrateAssignedStaffIds() {
    try {
        const db = await getDb();
        const col = db.collection("productions");

        // Find productions where assignedStaff contains plain strings
        const broken = await col
            .find({
                assignedStaff: { $elemMatch: { $type: "string" } },
            })
            .toArray();

        if (broken.length === 0) {
            console.log("[Migration] assignedStaff: no broken records found");
            return;
        }

        console.log(
            `[Migration] Found ${broken.length} productions with string IDs. Fixing...`
        );

        let fixed = 0;
        let failed = 0;

        for (const doc of broken) {
            try {
                const fixedIds = (doc.assignedStaff as any[])
                    .filter((id) => ObjectId.isValid(String(id)))
                    .map((id) => new ObjectId(String(id)));

                await col.updateOne(
                    { _id: doc._id },
                    { $set: { assignedStaff: fixedIds } }
                );
                fixed++;
            } catch (err) {
                failed++;
                console.error(
                    `[Migration] Failed to fix production ${doc._id}:`,
                    err
                );
            }
        }

        console.log(
            `[Migration] assignedStaff fix complete. Fixed: ${fixed}, Failed: ${failed}`
        );
    } catch (err) {
        console.error("[Migration] Failed:", err);
    }
}

// Allow running as standalone script
if (require.main === module) {
    migrateAssignedStaffIds()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
