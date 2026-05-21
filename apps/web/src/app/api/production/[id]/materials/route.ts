import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * POST /api/production/[id]/materials
 *
 * Save/upsert materials list for a production job into production_material_usage.
 * Called after creating or updating a production job.
 *
 * Body: { materials: [{ inventoryItemId, itemName, quantityUsed, unit, wastagePercent? }] }
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: jobId } = await params;
        const body = await request.json();
        const { materials } = body;

        if (!Array.isArray(materials)) {
            return NextResponse.json(
                { error: "materials must be an array" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const userId = getDataOwnerId(user);

        // Verify the production job exists and belongs to user
        const { ObjectId } = await import("mongodb");
        let jobExists;
        try {
            jobExists = await db
                .collection("productions")
                .findOne({ _id: new ObjectId(jobId), userId });
        } catch {
            return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
        }

        if (!jobExists) {
            return NextResponse.json(
                { error: "Production job not found" },
                { status: 404 }
            );
        }

        // Delete existing material usage records for this job (upsert behavior)
        await db
            .collection("production_material_usage")
            .deleteMany({ productionJobId: jobId, userId });

        // Insert new records
        const now = new Date();
        const docs = materials
            .filter((m: any) => m.inventoryItemId && m.itemName)
            .map((m: any) => ({
                userId,
                productionJobId: jobId,
                inventoryItemId: m.inventoryItemId,
                itemName: m.itemName,
                quantityUsed: Number(m.quantityUsed) || 0,
                unit: m.unit || "",
                wastagePercent: Number(m.wastagePercent) || 0,
                createdAt: now,
            }));

        if (docs.length > 0) {
            await db.collection("production_material_usage").insertMany(docs);
        }

        return NextResponse.json({
            success: true,
            jobId,
            materialsCount: docs.length,
        });
    } catch (error: any) {
        console.error("Error saving production materials:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
