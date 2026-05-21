import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/production/materials/recent
 *
 * Returns recently used inventory item IDs from production_material_usage.
 * Used to show "Recently Used" section at top of the Add Material dropdown.
 */
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const userId = getDataOwnerId(user);

        // Get unique recently used materials from last 90 days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);

        const recentUsages = await db
            .collection("production_material_usage")
            .aggregate([
                {
                    $match: {
                        userId,
                        createdAt: { $gte: cutoff },
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $group: {
                        _id: "$inventoryItemId",
                        itemName: { $first: "$itemName" },
                        unit: { $first: "$unit" },
                        lastUsed: { $first: "$createdAt" },
                        usageCount: { $sum: 1 },
                    },
                },
                {
                    $sort: { lastUsed: -1 },
                },
                {
                    $limit: 20,
                },
            ])
            .toArray();

        return NextResponse.json(
            recentUsages.map((r: any) => ({
                inventoryItemId: r._id,
                itemName: r.itemName,
                unit: r.unit,
                lastUsed: r.lastUsed,
                usageCount: r.usageCount,
            }))
        );
    } catch (error: any) {
        console.error("Error fetching recent materials:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
