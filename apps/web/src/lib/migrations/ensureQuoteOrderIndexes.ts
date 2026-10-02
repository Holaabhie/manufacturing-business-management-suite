/**
 * Migration: Ensure orders.quotation_id sparse index exists
 *
 * Safe to run multiple times (idempotent — createIndex is a no-op if exists).
 */
import { getDb } from "@/lib/mongodb";

export async function ensureQuoteOrderIndexes() {
    try {
        const db = await getDb();
        const col = db.collection("orders");

        await col.createIndex(
            { quotation_id: 1 },
            { name: "quotation_id_1", sparse: true, background: true }
        );
        console.log("[Index] orders.quotation_id_1 index ensured.");
    } catch (err) {
        console.error("[Index] Failed to create orders.quotation_id index:", err);
    }
}
