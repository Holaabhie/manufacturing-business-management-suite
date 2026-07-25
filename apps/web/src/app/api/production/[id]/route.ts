import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { triggerNotification } from "@/lib/notifications/dispatcher";
import { syncOrderStatusFromProduction } from "@/lib/utils/orderStatusSync";

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

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: "Invalid production ID" },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Fetch production — scoped to data owner for Admin/Owner
        // Staff access is validated separately below
        const isAdmin = user.role === "Admin" || user.role === "Owner";
        const production = isAdmin
            ? await db
                  .collection("productions")
                  .findOne({ _id: new ObjectId(id), userId: getDataOwnerId(user) })
            : await db
                  .collection("productions")
                  .findOne({ _id: new ObjectId(id) });

        if (!production) {
            return NextResponse.json(
                { error: "Production not found" },
                { status: 404 }
            );
        }

        // Staff access control: must be in assignedStaff array
        if (!isAdmin) {
            const assignedStaff = (production.assignedStaff as any[]) || [];
            const isAssigned = assignedStaff.some(
                (memberId: any) =>
                    String(memberId) === String(user._id)
            );

            if (!isAssigned) {
                return NextResponse.json(
                    { error: "Access denied" },
                    { status: 403 }
                );
            }
        }

        // Resolve assigned staff names for the response
        let assignedStaffDetails: any[] = [];
        if (production.assignedStaff && (production.assignedStaff as any[]).length > 0) {
            const staffDocs = await db
                .collection("users")
                .find({ _id: { $in: production.assignedStaff as ObjectId[] } })
                .project({ fullName: 1, full_name: 1, email: 1 })
                .toArray();
            assignedStaffDetails = staffDocs.map((s: any) => ({
                id: String(s._id),
                name: s.fullName || s.full_name || s.email || "Unknown",
                email: s.email || "",
            }));
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
            assignedStaff: assignedStaffDetails,
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

        // Guard: prevent editing completed productions
        if (existing.status === "completed" && body.action !== "complete") {
            return NextResponse.json(
                { error: "Production already completed. Reopen required to edit." },
                { status: 400 }
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
                    // ─── Read-only low-stock check (no deduction — stock was already
                    //     deducted at order creation in POST /api/orders) ───
                    {
                        const materials = existing.materials || [];
                        const lowStockAlerts: any[] = [];

                        if (materials.length > 0) {
                            const origin = new URL(request.url).origin;
                            const cookieHeader = request.headers.get("cookie") || "";

                            // Fetch current inventory to check stock levels
                            const checkRes = await fetch(`${origin}/api/inventory`, {
                                headers: { Cookie: cookieHeader },
                            });

                            if (checkRes.ok) {
                                const allItems = await checkRes.json();
                                if (Array.isArray(allItems)) {
                                    for (const mat of materials) {
                                        const itemId = mat.inventoryId || mat.inventoryItemId;
                                        if (!itemId) continue;

                                        const item = allItems.find((i: any) => i.id === itemId);
                                        if (item && item.quantity !== undefined) {
                                            const minLevel = Number(item.min_stock_level || item.minStockLevel || 10);
                                            if (item.quantity <= minLevel) {
                                                lowStockAlerts.push({
                                                    itemId,
                                                    itemName: item.name || mat.name || mat.itemName,
                                                    currentStock: item.quantity,
                                                    minStockLevel: minLevel,
                                                    unit: item.unit || mat.unit,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Store low-stock alerts on the production for reference
                        body._lowStockAlerts = lowStockAlerts;
                    }

                    actionText = "Production Completed";
                    detailsText = `Production completed. Final: ${body.producedQuantity || existing.producedQuantity} produced, ${body.rejectQuantity || existing.rejectQuantity} rejected.`;
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

        // Calculate progress using processedUnits (good + rejected)
        const produced =
            body.producedQuantity !== undefined
                ? Number(body.producedQuantity)
                : existing.producedQuantity || 0;
        const rejected =
            body.rejectQuantity !== undefined
                ? Number(body.rejectQuantity)
                : existing.rejectQuantity || 0;
        const expected = existing.expectedOutput || 1;
        const processedUnits = produced + rejected;
        const progressPercent = Math.min(
            Math.round((processedUnits / expected) * 100),
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
        if (body._materialsDeducted) updateData.materialsDeducted = body._materialsDeducted;
        if (body._lowStockAlerts) updateData.lowStockAlerts = body._lowStockAlerts;

        await db
            .collection("productions")
            .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        // Return updated document
        const updated = await db
            .collection("productions")
            .findOne({ _id: new ObjectId(id) });

        // ── Trigger notification for production complete ──
        if (body.action === "complete" && updated) {
            triggerNotification({
                eventType: "production_complete",
                payload: {
                    productName: updated.orderProductName || "Unknown Product",
                    completedQty: updated.producedQuantity || 0,
                    orderId: updated.orderId || "",
                },
                triggeredBy: getDataOwnerId(user),
            }).catch(() => {}); // fire-and-forget

            // ── Sync order status when production completes (via shared helper) ──
            if (updated.orderId) {
                try {
                    await syncOrderStatusFromProduction(updated.orderId, getDataOwnerId(user));
                } catch (syncErr) {
                    console.error("Failed to sync order status on production complete:", syncErr);
                    // Non-blocking — production completion still succeeds
                }
            }
        }

        // For completion, return enhanced response
        if (body.action === "complete") {
            return NextResponse.json({
                id: updated!._id.toString(),
                jobId: updated!._id.toString(),
                status: "COMPLETED",
                materialsDeducted: body._materialsDeducted || [],
                lowStockAlerts: body._lowStockAlerts || [],
                ...updated,
            });
        }

        return NextResponse.json({
            id: updated!._id.toString(),
            ...updated,
        });
    } catch (error: any) {
        console.error("Error updating production:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── DELETE: Soft-delete production (set status to "closed") ─────────
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only admins can delete
        if (user.role !== "Admin" && user.role !== "Owner") {
            return NextResponse.json(
                { success: false, message: "Only admins can delete productions" },
                { status: 403 }
            );
        }

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid production id" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const ownerId = getDataOwnerId(user);
        const productionId = new ObjectId(id);

        // Check existence
        const production = await db
            .collection("productions")
            .findOne({ _id: productionId, userId: ownerId });

        if (!production) {
            return NextResponse.json(
                { success: false, message: "Production not found" },
                { status: 404 }
            );
        }

        // Idempotency: already closed = success
        if (production.status === "closed") {
            return NextResponse.json({ success: true });
        }

        // Soft delete — NEVER deleteOne()
        await db.collection("productions").updateOne(
            { _id: productionId, userId: ownerId },
            {
                $set: {
                    status: "closed",
                    updatedAt: new Date(),
                    closedAt: new Date(),
                    closedBy: String(user._id),
                },
            }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting production:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
