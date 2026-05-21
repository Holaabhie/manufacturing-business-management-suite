/**
 * Purchasing Stats API — /api/purchasing/stats
 * ─────────────────────────────────────────────────────────
 * Server-side aggregation for purchasing dashboard KPIs.
 * Returns totalSpent, pendingCount, orderedCount, receivedCount.
 */

import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = getDataOwnerId(user);
        const db = await getDb();
        const collection = db.collection("purchase_orders");

        // Run all aggregation queries in parallel
        const [spentResult, statusCounts] = await Promise.all([
            // Total amount spent on received POs
            collection
                .aggregate([
                    { $match: { userId, status: "Received" } },
                    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
                ])
                .toArray(),

            // Count by status
            collection
                .aggregate([
                    { $match: { userId } },
                    { $group: { _id: "$status", count: { $sum: 1 } } },
                ])
                .toArray(),
        ]);

        const totalSpent = spentResult[0]?.total ?? 0;

        // Parse status counts into a lookup object
        const counts: Record<string, number> = {};
        for (const row of statusCounts) {
            counts[row._id as string] = row.count;
        }

        return NextResponse.json({
            success: true,
            data: {
                totalSpent,
                pendingCount: counts["Pending"] ?? 0,
                orderedCount: counts["Ordered"] ?? 0,
                receivedCount: counts["Received"] ?? 0,
                totalOrders: (counts["Pending"] ?? 0) + (counts["Ordered"] ?? 0) + (counts["Received"] ?? 0),
            },
        });
    } catch (error: any) {
        console.error("Error fetching purchasing stats:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
