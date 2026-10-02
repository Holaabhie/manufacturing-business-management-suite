/**
 * Migration: Ensure vendor_bills and vendor_bill_payments indexes exist
 *
 * Safe to run multiple times (idempotent — createIndex is a no-op if exists).
 */
import { getDb } from "@/lib/mongodb";

export async function ensureVendorBillIndexes() {
    try {
        const db = await getDb();
        const billsCol = db.collection("vendor_bills");
        const paymentsCol = db.collection("vendor_bill_payments");

        // 1. Partial unique index on { userId, dup_key } for atomic duplicate prevention among non-void bills
        // Note: MongoDB compound sparse indexes index missing fields as null. Using partialFilterExpression
        // ensures only documents where dup_key is an actual string are indexed.
        const existingIndexes = await billsCol.indexes();
        const oldDupIdx = existingIndexes.find((idx) => idx.name === "userId_1_dup_key_1");
        if (oldDupIdx && !oldDupIdx.partialFilterExpression) {
            await billsCol.dropIndex("userId_1_dup_key_1");
        }
        await billsCol.createIndex(
            { userId: 1, dup_key: 1 },
            {
                name: "userId_1_dup_key_1",
                unique: true,
                partialFilterExpression: { dup_key: { $type: "string" } },
                background: true,
            }
        );

        // 2. Query indexes on vendor_bills
        await billsCol.createIndex(
            { userId: 1, bill_date: -1 },
            { name: "userId_1_bill_date_-1", background: true }
        );

        await billsCol.createIndex(
            { userId: 1, vendor_id: 1 },
            { name: "userId_1_vendor_id_1", background: true }
        );

        await billsCol.createIndex(
            { userId: 1, purchase_order_id: 1 },
            { name: "userId_1_purchase_order_id_1", sparse: true, background: true }
        );

        await billsCol.createIndex(
            { userId: 1, status: 1 },
            { name: "userId_1_status_1", background: true }
        );

        // 3. Query indexes on vendor_bill_payments
        await paymentsCol.createIndex(
            { userId: 1, vendor_bill_id: 1 },
            { name: "userId_1_vendor_bill_id_1", background: true }
        );

        await paymentsCol.createIndex(
            { userId: 1, payment_date: -1 },
            { name: "userId_1_payment_date_-1", background: true }
        );

        await paymentsCol.createIndex(
            { userId: 1, vendor_id: 1 },
            { name: "userId_1_vendor_id_1", background: true }
        );

        console.log("[Index] vendor_bills and vendor_bill_payments indexes ensured.");
    } catch (err) {
        console.error("[Index] Failed to ensure vendor bill indexes:", err);
    }
}
