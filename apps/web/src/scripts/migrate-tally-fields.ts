/**
 * MongoDB Migration — Add Tally Prime Fields
 * ─────────────────────────────────────────────────────────
 * Adds tally sync fields to existing bills documents and
 * tally config fields to company profiles.
 *
 * Run with: npx tsx src/scripts/migrate-tally-fields.ts
 *
 * Safe to run multiple times — uses $set with defaults,
 * only updates documents that don't have the fields yet.
 */

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "ind_manager";

async function migrate() {
    console.log("🔄 Tally Prime Migration — Starting...");
    console.log(`   DB: ${DB_NAME}`);

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        // ─── 1. Bills Collection — Add tally sync fields ─────────
        console.log("\n📋 Updating bills collection...");
        const billsResult = await db.collection("bills").updateMany(
            { tallySynced: { $exists: false } },
            {
                $set: {
                    tallySynced: false,
                    tallyVoucherNumber: null,
                    tallySyncedAt: null,
                },
            },
        );
        console.log(`   ✅ Updated ${billsResult.modifiedCount} bill(s)`);
        console.log(`   ℹ️  ${billsResult.matchedCount} matched, ${billsResult.modifiedCount} modified`);

        // ─── 2. Company Profiles — Add tally config fields ───────
        console.log("\n🏢 Updating companyprofiles collection...");
        const companyResult = await db.collection("companyprofiles").updateMany(
            { tally_bridge_url: { $exists: false } },
            {
                $set: {
                    tally_company_name: null,
                    tally_bridge_url: "http://localhost:4567",
                    tally_auth_token: null,
                },
            },
        );
        console.log(`   ✅ Updated ${companyResult.modifiedCount} company profile(s)`);
        console.log(`   ℹ️  ${companyResult.matchedCount} matched, ${companyResult.modifiedCount} modified`);

        // ─── 3. Create index for tally sync queries ──────────────
        console.log("\n🔍 Creating indexes...");
        await db.collection("bills").createIndex(
            { tallySynced: 1 },
            { name: "idx_bills_tally_synced", background: true },
        );
        console.log("   ✅ Created index: idx_bills_tally_synced");

        console.log("\n✅ Tally Prime Migration — Complete!");

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

migrate();
