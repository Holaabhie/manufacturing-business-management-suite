import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ─── GET: List all productions ──────────────────────────────────────
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const productions = await db
            .collection("productions")
            .find({ userId: getDataOwnerId(user) })
            .sort({ createdAt: -1 })
            .toArray();

        const formatted = productions.map((p: any) => ({
            id: p._id.toString(),
            orderId: p.orderId,
            orderProductName: p.orderProductName,
            orderQuantity: p.orderQuantity,
            clientName: p.clientName,
            deliveryDate: p.deliveryDate,
            batchNumber: p.batchNumber,
            materials: p.materials || [],
            machineId: p.machineId,
            machineName: p.machineName,
            operatorId: p.operatorId,
            operatorName: p.operatorName,
            expectedOutput: p.expectedOutput,
            startTime: p.startTime,
            shift: p.shift,
            targetCompletion: p.targetCompletion,
            status: p.status,
            producedQuantity: p.producedQuantity || 0,
            rejectQuantity: p.rejectQuantity || 0,
            progressPercent: p.progressPercent || 0,
            activityLog: p.activityLog || [],
            notes: p.notes || "",
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            completedAt: p.completedAt,
            createdBy: p.createdBy,
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error("Error fetching productions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── POST: Create new production ────────────────────────────────────
// NOTE: Inventory is NO LONGER deducted here.
// Materials are saved to production_material_usage for memory/pre-fill.
// Actual inventory deduction happens when the job is marked COMPLETED.
export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const db = await getDb();

        // Generate batch number
        const count = await db.collection("productions").countDocuments({
            userId: getDataOwnerId(user),
        });
        const batchNumber =
            body.batchNumber ||
            `PRD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

        const now = new Date();
        const userName =
            user.fullName || user.full_name || user.email?.split("@")[0] || "System";

        const production = {
            userId: getDataOwnerId(user),
            orderId: body.orderId,
            orderProductName: body.orderProductName,
            orderQuantity: Number(body.orderQuantity),
            clientName: body.clientName,
            deliveryDate: body.deliveryDate || null,
            batchNumber,
            materials: body.materials || [],
            machineId: body.machineId || "",
            machineName: body.machineName || "",
            operatorId: body.operatorId || "",
            operatorName: body.operatorName || "",
            expectedOutput: Number(body.expectedOutput),
            startTime: body.startTime,
            shift: body.shift || "morning",
            targetCompletion: body.targetCompletion,
            status: "pending" as const,
            producedQuantity: 0,
            rejectQuantity: 0,
            progressPercent: 0,
            activityLog: [
                {
                    id: new ObjectId().toString(),
                    timestamp: now.toISOString(),
                    action: "Production Created",
                    performedBy: userName,
                    performedByRole: user.role || "Staff",
                    details: `Production batch ${batchNumber} created for order ${body.orderProductName}`,
                },
            ],
            notes: body.notes || "",
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            createdBy: userName,
        };

        const result = await db.collection("productions").insertOne(production);
        const jobId = result.insertedId.toString();

        // ─── Save materials to production_material_usage ───
        if (body.materials && Array.isArray(body.materials) && body.materials.length > 0) {
            const materialDocs = body.materials
                .filter((m: any) => m.inventoryId || m.inventoryItemId)
                .map((m: any) => ({
                    userId: getDataOwnerId(user),
                    productionJobId: jobId,
                    inventoryItemId: m.inventoryId || m.inventoryItemId,
                    itemName: m.name || m.itemName || "",
                    quantityUsed: Number(m.quantityUsed || m.quantity) || 0,
                    unit: m.unit || "",
                    wastagePercent: Number(m.wastagePercent) || 0,
                    createdAt: now,
                }));

            if (materialDocs.length > 0) {
                await db
                    .collection("production_material_usage")
                    .insertMany(materialDocs);
            }
        }

        return NextResponse.json({
            id: jobId,
            ...production,
        });
    } catch (error: any) {
        console.error("Error creating production:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
