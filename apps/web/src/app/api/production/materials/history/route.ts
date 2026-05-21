import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/production/materials/history?productName=X
 *
 * Returns the most recent material list for the given product name.
 * Queries production_material_usage joined with productions collection.
 *
 * Matching logic:
 * 1. Exact product name match → use that job's materials
 * 2. No match → return empty array
 */
export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productName = searchParams.get("productName");

        if (!productName) {
            return NextResponse.json(
                { error: "productName query parameter is required" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const userId = getDataOwnerId(user);

        // Find the most recent completed production job with matching product name
        const matchingJob = await db
            .collection("productions")
            .findOne(
                {
                    userId,
                    orderProductName: { $regex: new RegExp(`^${escapeRegex(productName)}$`, "i") },
                    status: "completed",
                },
                { sort: { completedAt: -1, createdAt: -1 } }
            );

        if (!matchingJob) {
            return NextResponse.json({
                matched: false,
                matchType: null,
                sourceJobId: null,
                sourceBatchNumber: null,
                sourceProductName: null,
                sourceCompletedAt: null,
                materials: [],
            });
        }

        // Get materials from production_material_usage for this job
        const materials = await db
            .collection("production_material_usage")
            .find({
                userId,
                productionJobId: matchingJob._id.toString(),
            })
            .toArray();

        return NextResponse.json({
            matched: true,
            matchType: "exact_product_name",
            sourceJobId: matchingJob._id.toString(),
            sourceBatchNumber: matchingJob.batchNumber || null,
            sourceProductName: matchingJob.orderProductName,
            sourceCompletedAt: matchingJob.completedAt || matchingJob.createdAt,
            materials: materials.map((m: any) => ({
                id: m._id.toString(),
                inventoryItemId: m.inventoryItemId,
                itemName: m.itemName,
                quantityUsed: m.quantityUsed,
                unit: m.unit,
                wastagePercent: m.wastagePercent || 0,
            })),
        });
    } catch (error: any) {
        console.error("Error fetching material history:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/** Escape special regex characters in user input */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
