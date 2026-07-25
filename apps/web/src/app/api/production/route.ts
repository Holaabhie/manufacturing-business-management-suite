import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getFinancialYear } from "@/lib/utils/financial-year";

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
            .find({ userId: getDataOwnerId(user), status: { $ne: "closed" } })
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
// Supports both legacy single machine/operator and new productionAssignments array.
// Inventory is NOT deducted here — happens at order creation time.
export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const db = await getDb();
        const ownerId = getDataOwnerId(user);

        // ─── Resolve assignments array ──────────────────────
        // Support new array format, fall back to legacy single fields
        let assignments: Array<{ machineId: string; machineName: string; operatorId: string; operatorName: string }>;

        if (Array.isArray(body.productionAssignments) && body.productionAssignments.length > 0) {
            assignments = body.productionAssignments;
        } else if (body.machineId || body.operatorId) {
            // Legacy single machine/operator — backward compat
            assignments = [{
                machineId: body.machineId || "",
                machineName: body.machineName || "",
                operatorId: body.operatorId || "",
                operatorName: body.operatorName || "",
            }];
        } else {
            assignments = [];
        }

        // ─── Validate: duplicate machine+operator pairs ─────
        if (assignments.length > 0) {
            const pairs = assignments.map((a) => `${a.machineId}:${a.operatorId}`);
            if (pairs.length !== new Set(pairs).size) {
                return NextResponse.json(
                    { success: false, message: "Duplicate machine and operator pairs found" },
                    { status: 400 }
                );
            }
        }

        // ─── Validate: all operators must be real Staff users ─
        const operatorIdsRaw = assignments.filter((a) => a.operatorId).map((a) => a.operatorId);

        if (operatorIdsRaw.length > 0) {
            const staffUsers = await db.collection("users").find({
                _id: { $in: operatorIdsRaw },
                role: "Staff",
            }).toArray();

            if (staffUsers.length !== operatorIdsRaw.length) {
                return NextResponse.json(
                    { success: false, message: "Some operators are not valid Staff users" },
                    { status: 400 }
                );
            }
        }

        // ─── Generate batch number ──────────────────────────
        const count = await db.collection("productions").countDocuments({
            userId: ownerId,
        });
        const batchNumber =
            body.batchNumber ||
            `PRD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

        const now = new Date();
        const userName =
            user.fullName || user.full_name || user.email?.split("@")[0] || "System";

        // Use first assignment for legacy single fields (backward compat)
        const firstAssignment = assignments[0] || { machineId: "", machineName: "", operatorId: "", operatorName: "" };

        const production = {
            userId: ownerId,
            orderId: body.orderId,
            orderProductName: body.orderProductName,
            orderQuantity: Number(body.orderQuantity),
            clientName: body.clientName,
            deliveryDate: body.deliveryDate || null,
            batchNumber,
            materials: body.materials || [],
            // Legacy single fields for backward compat
            machineId: firstAssignment.machineId,
            machineName: firstAssignment.machineName,
            operatorId: firstAssignment.operatorId,
            operatorName: firstAssignment.operatorName,
            // New multi-assignment fields
            productionAssignments: assignments.map((a) => ({
                machineId: a.machineId,
                machineName: a.machineName || "",
                operatorId: a.operatorId || null,
                operatorName: a.operatorName || "",
                assignedAt: now,
            })),
            assignedStaff: operatorIdsRaw,
            assignmentLogs: operatorIdsRaw.length > 0 ? [{
                assignedBy: String(user._id),
                assignedStaff: operatorIdsRaw,
                timestamp: now,
            }] : [],
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
            financial_year: getFinancialYear(now),
        };

        const result = await db.collection("productions").insertOne(production);
        const jobId = result.insertedId.toString();

        // ─── Save materials to production_material_usage ───
        if (body.materials && Array.isArray(body.materials) && body.materials.length > 0) {
            const materialDocs = body.materials
                .filter((m: any) => m.inventoryId || m.inventoryItemId)
                .map((m: any) => ({
                    userId: ownerId,
                    productionJobId: jobId,
                    inventoryItemId: m.inventoryId || m.inventoryItemId,
                    itemName: m.name || m.itemName || "",
                    quantityUsed: Number(m.quantityUsed || m.quantity) || 0,
                    unit: m.unit || "",
                    wastagePercent: Number(m.wastagePercent) || 0,
                    createdAt: now,
                    financial_year: getFinancialYear(now),
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
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
