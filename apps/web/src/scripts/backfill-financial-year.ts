/**
 * Backfill financial_year for existing documents
 * ────────────────────────────────────────────────────
 * One-time, idempotent migration script.
 * Only adds `financial_year` to documents that don't have it.
 * Never modifies existing data fields.
 *
 * Run: npx tsx apps/web/src/scripts/backfill-financial-year.ts
 *
 * Requires MONGODB_URI environment variable.
 */

import { MongoClient } from "mongodb";

// Inline getFinancialYear to avoid path alias issues in standalone script
function getFinancialYear(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    const month = d.getMonth();
    const year = d.getFullYear();
    const fyStartYear = month < 3 ? year - 1 : year;
    const fyEndYear = fyStartYear + 1;
    return `${fyStartYear}-${String(fyEndYear).slice(-2)}`;
}

interface CollectionConfig {
    name: string;
    primaryDateField: string;
    fallbackDateField?: string;
}

const COLLECTIONS: CollectionConfig[] = [
    { name: "orders", primaryDateField: "createdAt" },
    { name: "productions", primaryDateField: "createdAt" },
    { name: "bills", primaryDateField: "billDate", fallbackDateField: "created_at" },
    { name: "payments", primaryDateField: "payment_date", fallbackDateField: "createdAt" },
    { name: "paymenttransactions", primaryDateField: "payment_date", fallbackDateField: "createdAt" },
    { name: "order_inventory_items", primaryDateField: "createdAt" },
    { name: "production_material_usage", primaryDateField: "createdAt" },
    { name: "materialConsumption", primaryDateField: "timestamp" },
];

const BATCH_SIZE = 500;

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("❌ MONGODB_URI environment variable is required");
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        const dbName = process.env.MONGODB_DB ?? "ind_manager";
        const db = client.db(dbName); // uses MONGODB_DB env var, same as app's getDb()
        console.log(`✅ Connected to MongoDB (db: ${dbName})\n`);

        let totalBackfilled = 0;
        let totalSkipped = 0;

        for (const config of COLLECTIONS) {
            const col = db.collection(config.name);

            // Check if collection exists
            const exists = await db.listCollections({ name: config.name }).hasNext();
            if (!exists) {
                console.log(`⏭️  ${config.name}: collection does not exist, skipping`);
                continue;
            }

            // Only process documents without financial_year
            const cursor = col.find({ financial_year: { $exists: false } });
            const total = await col.countDocuments({ financial_year: { $exists: false } });
            const alreadyDone = await col.countDocuments({ financial_year: { $exists: true } });

            console.log(`📋 ${config.name}: ${total} to backfill (${alreadyDone} already done)`);

            if (total === 0) continue;

            let bulkOps: any[] = [];
            let processed = 0;
            let skipped = 0;

            for await (const doc of cursor) {
                const dateValue = doc[config.primaryDateField]
                    ?? (config.fallbackDateField ? doc[config.fallbackDateField] : null);

                const fy = getFinancialYear(dateValue as Date | string | null);

                if (!fy) {
                    skipped++;
                    continue;
                }

                bulkOps.push({
                    updateOne: {
                        filter: { _id: doc._id },
                        update: { $set: { financial_year: fy } },
                    },
                });

                if (bulkOps.length >= BATCH_SIZE) {
                    await col.bulkWrite(bulkOps);
                    processed += bulkOps.length;
                    process.stdout.write(`   ↳ ${processed}/${total} done\r`);
                    bulkOps = [];
                }
            }

            // Final flush
            if (bulkOps.length > 0) {
                await col.bulkWrite(bulkOps);
                processed += bulkOps.length;
            }

            totalBackfilled += processed;
            totalSkipped += skipped;

            console.log(`   ✅ ${config.name}: backfilled ${processed}, skipped ${skipped} (no valid date)`);
        }

        console.log(`\n🎉 Done! Total backfilled: ${totalBackfilled}, skipped: ${totalSkipped}`);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

main();
