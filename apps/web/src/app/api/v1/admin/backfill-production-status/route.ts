/**
 * Backfill Production Status — POST /api/v1/admin/backfill-production-status
 * ──────────────────────────────────────────────────────────────────────────────
 * Computes production_status for all existing orders from their real production
 * records in the `productions` collection.
 *
 * IMPORTANT:
 * - Does NOT set production_status_manual_override — that flag is only for
 *   future manual "Complete Order" button clicks.
 * - Only runs for orders that do NOT already have production_status set.
 * - Safe to run multiple times (idempotent).
 *
 * Run this immediately after deploying the order-status fix code.
 */

import { type NextRequest } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admin/owner can run backfill
        const role = (user as any).role || "";
        if (role !== "admin" && role !== "owner" && role !== "Admin" && role !== "Owner") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const ownerId = getDataOwnerId(user);
        const db = await getDb();

        // Find all orders without production_status
        const orders = await db.collection("orders")
            .find({
                userId: ownerId,
                production_status: { $exists: false },
            })
            .project({ _id: 1, status: 1 })
            .toArray();

        let updated = 0;
        let skipped = 0;
        let noProduction = 0;

        for (const order of orders) {
            const orderId = order._id.toString();

            // Find all non-cancelled production records for this order
            const productions = await db.collection("productions")
                .find({
                    orderId,
                    userId: ownerId,
                    status: { $nin: ["closed", "cancelled"] },
                })
                .project({ status: 1 })
                .toArray();

            if (!productions.length) {
                // No production records — leave production_status unset
                // (these orders will derive status from rawStatus fallback)
                noProduction++;
                continue;
            }

            const allComplete = productions.every((p) => p.status === "completed");
            const anyActive = productions.some(
                (p) => p.status === "in_progress" || p.status === "completed"
            );

            let newProductionStatus: string;
            if (allComplete) {
                newProductionStatus = "completed";
            } else if (anyActive) {
                newProductionStatus = "processing";
            } else {
                newProductionStatus = "pending";
            }

            // Set production_status — do NOT set production_status_manual_override
            await db.collection("orders").updateOne(
                { _id: order._id },
                {
                    $set: {
                        production_status: newProductionStatus,
                        updatedAt: new Date(),
                    },
                },
            );
            updated++;
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalOrders: orders.length,
                updated,
                skipped,
                noProductionRecords: noProduction,
            },
        });
    } catch (error: any) {
        console.error("[backfill-production-status] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
