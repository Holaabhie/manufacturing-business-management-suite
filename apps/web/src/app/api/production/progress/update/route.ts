import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ─── POST: Record a production progress update ──────────────────────
// This creates a new entry in the productionProgress collection
// and also updates the main production record.
export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const db = await getDb();

        // Validation
        if (!body.productionId) {
            return NextResponse.json(
                { error: "productionId is required" },
                { status: 400 }
            );
        }

        const producedQty = Number(body.producedQty ?? 0);
        const rejectedQty = Number(body.rejectedQty ?? 0);

        if (producedQty < 0) {
            return NextResponse.json(
                { error: "producedQty cannot be negative" },
                { status: 400 }
            );
        }

        if (rejectedQty < 0) {
            return NextResponse.json(
                { error: "rejectedQty cannot be negative" },
                { status: 400 }
            );
        }

        const userId = user._id.toString();
        const adminId = getDataOwnerId(user);

        // Find the production record
        const production = await db.collection("productions").findOne({
            _id: new ObjectId(body.productionId),
        });

        if (!production) {
            return NextResponse.json(
                { error: "Production not found" },
                { status: 404 }
            );
        }

        // Ensure the user belongs to the same admin scope
        if (production.userId !== adminId && production.userId !== userId) {
            return NextResponse.json(
                { error: "Access denied" },
                { status: 403 }
            );
        }

        if (production.status === "completed") {
            return NextResponse.json(
                { error: "Cannot update progress on a completed production" },
                { status: 400 }
            );
        }

        const now = new Date();
        const userName =
            user.fullName || (user as any).full_name || user.email?.split("@")[0] || "System";

        // Store old values for audit trail (Feature 10)
        const oldProducedQty = production.producedQuantity || 0;
        const oldRejectedQty = production.rejectQuantity || 0;
        const oldProgressPercent = production.progressPercent || 0;

        // Support direct progressPercent from slider
        const newProgressPercent = body.progressPercent !== undefined
            ? Math.min(Math.max(Number(body.progressPercent), 0), 100)
            : null;

        // 1. Insert progress record with audit trail
        const progressEntry = {
            productionId: body.productionId,
            producedQty,
            rejectedQty,
            notes: body.notes?.trim() || "",
            updatedBy: userId,
            updatedByName: userName,
            updatedByRole: user.role || "Staff",
            timestamp: now,
            // Audit trail — never overwrite history (Feature 10)
            audit: {
                oldValues: {
                    producedQuantity: oldProducedQty,
                    rejectQuantity: oldRejectedQty,
                    progressPercent: oldProgressPercent,
                },
                newValues: {
                    producedQuantity: producedQty,
                    rejectQuantity: rejectedQty,
                    progressPercent: newProgressPercent,
                },
            },
            // Material consumption (Feature 8)
            materialsConsumed: body.materialsConsumed || [],
        };

        const progressResult = await db
            .collection("productionProgress")
            .insertOne(progressEntry);

        // 2. Material consumption deduction (Feature 8)
        if (body.materialsConsumed && Array.isArray(body.materialsConsumed)) {
            for (const mat of body.materialsConsumed) {
                if (!mat.inventoryId || !mat.quantityUsed) continue;

                const invItem = await db
                    .collection("inventory")
                    .findOne({ _id: new ObjectId(mat.inventoryId) });

                if (!invItem) continue;

                const newQty = Number(invItem.quantity) - Number(mat.quantityUsed);
                if (newQty < 0) {
                    // Prevent negative stock — skip but log warning
                    console.warn(
                        `Insufficient stock for ${mat.name || mat.inventoryId}. Available: ${invItem.quantity}, Requested: ${mat.quantityUsed}`
                    );
                    continue;
                }

                await db.collection("inventory").updateOne(
                    { _id: new ObjectId(mat.inventoryId) },
                    { $set: { quantity: newQty, updatedAt: now } }
                );

                // Log material consumption
                await db.collection("materialConsumption").insertOne({
                    productionId: body.productionId,
                    batchNumber: production.batchNumber,
                    inventoryId: mat.inventoryId,
                    materialName: mat.name || invItem.name,
                    quantityUsed: Number(mat.quantityUsed),
                    unit: mat.unit || invItem.unit || "kg",
                    previousStock: Number(invItem.quantity),
                    newStock: newQty,
                    consumedBy: userId,
                    consumedByName: userName,
                    timestamp: now,
                    adminId,
                });
            }
        }

        // 3. Update the main production record
        const newProduced = producedQty;
        const newRejected = rejectedQty;
        const expected = production.expectedOutput || 1;
        const progressPercent = newProgressPercent !== null
            ? newProgressPercent
            : Math.min(Math.round((newProduced / expected) * 100), 100);

        const activityLog = [...(production.activityLog || [])];
        activityLog.push({
            id: new ObjectId().toString(),
            timestamp: now.toISOString(),
            action: "Progress Updated",
            performedBy: userName,
            performedByRole: user.role || "Staff",
            details: `Progress: ${oldProgressPercent}% → ${progressPercent}% | Produced: ${producedQty}, Rejected: ${rejectedQty}${body.notes ? ` — ${body.notes.trim()}` : ""}`,
            oldValues: { producedQuantity: oldProducedQty, rejectQuantity: oldRejectedQty, progressPercent: oldProgressPercent },
            newValues: { producedQuantity: newProduced, rejectQuantity: newRejected, progressPercent },
        });

        const updateFields: any = {
            producedQuantity: newProduced,
            rejectQuantity: newRejected,
            progressPercent,
            activityLog,
            updatedAt: now,
        };

        // Auto-complete if progress reaches 100%
        if (progressPercent >= 100) {
            updateFields.status = "completed";
            updateFields.completedAt = now;
        } else if (production.status === "pending") {
            updateFields.status = "in_progress";
        }

        await db.collection("productions").updateOne(
            { _id: new ObjectId(body.productionId) },
            { $set: updateFields }
        );

        // 4. Auto-mark attendance (Feature 4)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existingAttendance = await db
            .collection("attendance")
            .findOne({
                userId,
                adminId,
                date: { $gte: todayStart },
            });

        if (!existingAttendance) {
            await db.collection("attendance").insertOne({
                userId,
                adminId,
                employeeId: (user as any).employeeId || "",
                employeeName: userName,
                date: todayStart,
                firstActivityTime: now,
                autoMarked: true,
                source: "production_update",
                createdAt: now,
            });
        }

        // 5. Update user lastActiveAt
        await db.collection("users").updateOne(
            { _id: userId as any },
            { $set: { lastActiveAt: now } }
        ).catch(() => { /* non-blocking */ });

        return NextResponse.json({
            success: true,
            progressId: progressResult.insertedId.toString(),
            producedQuantity: newProduced,
            rejectQuantity: newRejected,
            progressPercent,
            oldValues: {
                producedQuantity: oldProducedQty,
                rejectQuantity: oldRejectedQty,
                progressPercent: oldProgressPercent,
            },
        });
    } catch (error: any) {
        console.error("Error updating production progress:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── GET: Fetch progress history for a production ────────────────────
// Query param: ?productionId=xxxxx
export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productionId = searchParams.get("productionId");

        if (!productionId) {
            return NextResponse.json(
                { error: "productionId query param is required" },
                { status: 400 }
            );
        }

        const db = await getDb();

        const history = await db
            .collection("productionProgress")
            .find({ productionId })
            .sort({ timestamp: -1 })
            .toArray();

        const formatted = history.map((h: any) => ({
            id: h._id.toString(),
            productionId: h.productionId,
            producedQty: h.producedQty,
            rejectedQty: h.rejectedQty,
            notes: h.notes || "",
            updatedBy: h.updatedBy,
            updatedByName: h.updatedByName || "Unknown",
            updatedByRole: h.updatedByRole || "Staff",
            timestamp: h.timestamp,
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error("Error fetching progress history:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
