import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ─── GET: Single production detail ──────────────────────────────────
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const db = await getDb();
        const production = await db
            .collection("productions")
            .findOne({ _id: new ObjectId(id), userId: getDataOwnerId(user) });

        if (!production) {
            return NextResponse.json(
                { error: "Production not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: production._id.toString(),
            orderId: production.orderId,
            orderProductName: production.orderProductName,
            orderQuantity: production.orderQuantity,
            clientName: production.clientName,
            deliveryDate: production.deliveryDate,
            batchNumber: production.batchNumber,
            materials: production.materials || [],
            machineId: production.machineId,
            machineName: production.machineName,
            operatorId: production.operatorId,
            operatorName: production.operatorName,
            expectedOutput: production.expectedOutput,
            startTime: production.startTime,
            shift: production.shift,
            targetCompletion: production.targetCompletion,
            status: production.status,
            producedQuantity: production.producedQuantity || 0,
            rejectQuantity: production.rejectQuantity || 0,
            progressPercent: production.progressPercent || 0,
            activityLog: production.activityLog || [],
            notes: production.notes || "",
            createdAt: production.createdAt,
            updatedAt: production.updatedAt,
            completedAt: production.completedAt,
            createdBy: production.createdBy,
        });
    } catch (error: any) {
        console.error("Error fetching production:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── PUT: Update production (progress, status, etc.) ────────────────
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const db = await getDb();

        const existing = await db
            .collection("productions")
            .findOne({ _id: new ObjectId(id), userId: getDataOwnerId(user) });

        if (!existing) {
            return NextResponse.json(
                { error: "Production not found" },
                { status: 404 }
            );
        }

        const userName =
            user.fullName || user.full_name || user.email?.split("@")[0] || "System";
        const userRole = user.role || "Staff";

        // Build activity log entry if status changed
        const newLog: any[] = [...(existing.activityLog || [])];
        const now = new Date();

        if (body.action) {
            let actionText = "";
            let detailsText = "";

            switch (body.action) {
                case "start":
                    actionText = "Production Started";
                    detailsText = `Production started by ${userName}`;
                    body.status = "running";
                    break;
                case "pause":
                    actionText = "Production Paused";
                    detailsText = body.reason
                        ? `Paused: ${body.reason}`
                        : `Production paused by ${userName}`;
                    body.status = "paused";
                    break;
                case "resume":
                    actionText = "Production Resumed";
                    detailsText = `Production resumed by ${userName}`;
                    body.status = "running";
                    break;
                case "complete":
                    actionText = "Production Completed";
                    detailsText = `Production completed. Final: ${body.producedQuantity || existing.producedQuantity} produced, ${body.rejectQuantity || existing.rejectQuantity} rejected`;
                    body.status = "completed";
                    body.completedAt = now.toISOString();
                    break;
                case "update_progress":
                    actionText = "Progress Updated";
                    detailsText = `Produced: ${body.producedQuantity}, Rejected: ${body.rejectQuantity}`;
                    break;
                default:
                    actionText = body.action;
                    detailsText = body.details || "";
            }

            newLog.push({
                id: new ObjectId().toString(),
                timestamp: now.toISOString(),
                action: actionText,
                performedBy: userName,
                performedByRole: userRole,
                details: detailsText,
            });
        }

        // Calculate progress
        const produced =
            body.producedQuantity !== undefined
                ? Number(body.producedQuantity)
                : existing.producedQuantity || 0;
        const expected = existing.expectedOutput || 1;
        const progressPercent = Math.min(
            Math.round((produced / expected) * 100),
            100
        );

        const updateData: any = {
            updatedAt: now,
            activityLog: newLog,
            progressPercent,
        };

        if (body.status !== undefined) updateData.status = body.status;
        if (body.producedQuantity !== undefined)
            updateData.producedQuantity = Number(body.producedQuantity);
        if (body.rejectQuantity !== undefined)
            updateData.rejectQuantity = Number(body.rejectQuantity);
        if (body.notes !== undefined) updateData.notes = body.notes;
        if (body.completedAt !== undefined) updateData.completedAt = body.completedAt;

        await db
            .collection("productions")
            .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        // Return updated document
        const updated = await db
            .collection("productions")
            .findOne({ _id: new ObjectId(id) });

        return NextResponse.json({
            id: updated!._id.toString(),
            ...updated,
        });
    } catch (error: any) {
        console.error("Error updating production:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── DELETE: Delete production ───────────────────────────────────────
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins can delete
        if (user.role !== "Admin") {
            return NextResponse.json(
                { error: "Only admins can delete productions" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const db = await getDb();
        const result = await db
            .collection("productions")
            .deleteOne({ _id: new ObjectId(id), userId: getDataOwnerId(user) });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Production not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting production:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
