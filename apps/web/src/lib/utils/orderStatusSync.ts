/**
 * Order Status Sync Utility
 * ─────────────────────────────────────────────────────────
 * Automatically updates an order's production_status based on the
 * aggregate status of its associated production records.
 *
 * Called after production create/update to keep order production state
 * in sync without manual intervention.
 *
 * IMPORTANT: This function writes to `production_status` (NOT `status`).
 * The `status` field is legacy and no longer maintained for production tracking.
 *
 * If `production_status_manual_override` is true on the order, this function
 * skips the write entirely — an Admin manually set production status via the UI.
 *
 * Status mapping:
 *   Production statuses: "pending" | "in_progress" | "completed" | "cancelled"
 *   Order production_status: "pending" | "processing" | "completed"
 */

import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function syncOrderStatusFromProduction(
    orderId: string,
    userId: string,
): Promise<void> {
    if (!orderId || !userId) return;

    const db = await getDb();

    // ─── Check for manual override first ───
    let orderOid: ObjectId;
    try {
        orderOid = new ObjectId(orderId);
    } catch {
        return; // Invalid ObjectId
    }

    const existingOrder = await db
        .collection("orders")
        .findOne({ _id: orderOid, userId });
    if (!existingOrder) return;

    // If admin manually force-completed production, never overwrite
    if (existingOrder.production_status_manual_override === true) return;

    // Fetch all non-closed production records for this order
    const productions = await db
        .collection("productions")
        .find({
            orderId,
            userId,
            status: { $nin: ["closed", "cancelled"] },
        })
        .project({ status: 1 })
        .toArray();

    if (!productions.length) return;

    // Determine aggregate status from production statuses
    const allComplete = productions.every(
        (p) => p.status === "completed",
    );
    const anyActive = productions.some(
        (p) => p.status === "in_progress" || p.status === "completed",
    );

    let newProductionStatus: string;
    if (allComplete) {
        newProductionStatus = "completed";
    } else if (anyActive) {
        newProductionStatus = "processing";
    } else {
        // All productions are still "pending" — don't change production status
        return;
    }

    // Avoid downgrading: don't overwrite "completed" with "processing"
    // Uses only production_status — NOT the legacy status field
    const currentProductionStatus = String(existingOrder.production_status || "pending");
    if (currentProductionStatus === "completed" && newProductionStatus === "processing") return;
    // Skip if production_status is already correct
    if (currentProductionStatus === newProductionStatus) return;

    // Build update fields — write to production_status, NOT status
    const now = new Date();
    const updateFields: Record<string, unknown> = {
        production_status: newProductionStatus,
        updatedAt: now,
    };

    if (newProductionStatus === "processing") {
        updateFields.processedAt = now;
    } else if (newProductionStatus === "completed") {
        updateFields.completedAt = now;
        // Also set processedAt if it wasn't set before
        if (!existingOrder.processedAt) {
            updateFields.processedAt = now;
        }
    }

    await db.collection("orders").updateOne(
        { _id: orderOid, userId },
        { $set: updateFields },
    );
}
