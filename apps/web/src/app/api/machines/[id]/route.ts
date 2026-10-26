import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { tenantFilter } from "@/lib/tenant-filter";

interface MachineDoc {
    _id: ObjectId;
    machineName: string;
    machineType?: string;
    capacity?: string;
    status: "active" | "inactive" | "maintenance";
    adminId: string;
    createdAt: Date;
    updatedAt: Date;
}

// ─── PUT: Update a machine (Admin only) ──────────────────────────────
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.role !== "Admin" && user.role !== "Owner") {
            return NextResponse.json(
                { error: "Only admins can update machines" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const db = await getDb();
        const adminId = getDataOwnerId(user);

        const existing = await db.collection<MachineDoc>("machines").findOne(
            tenantFilter(adminId, "machines", { _id: new ObjectId(id) })
        );

        if (!existing) {
            return NextResponse.json(
                { error: "Machine not found" },
                { status: 404 }
            );
        }

        const updates: Partial<MachineDoc> & { updatedAt: Date } = { updatedAt: new Date() };

        if (body.machineName !== undefined) {
            const name = body.machineName.trim();
            if (!name) {
                return NextResponse.json(
                    { error: "Machine name is required" },
                    { status: 400 }
                );
            }
            // Check duplicate (excluding current)
            const dup = await db.collection<MachineDoc>("machines").findOne({
                adminId,
                machineName: name,
                _id: { $ne: new ObjectId(id) },
            });
            if (dup) {
                return NextResponse.json(
                    { error: "A machine with this name already exists" },
                    { status: 409 }
                );
            }
            updates.machineName = name;
        }

        if (body.machineType !== undefined) updates.machineType = body.machineType.trim();
        if (body.capacity !== undefined) updates.capacity = body.capacity.trim();
        if (body.status !== undefined) {
            if (!["active", "inactive", "maintenance"].includes(body.status)) {
                return NextResponse.json(
                    { error: "Invalid status. Must be active, inactive, or maintenance" },
                    { status: 400 }
                );
            }
            updates.status = body.status;
        }

        const updateResult = await db
            .collection<MachineDoc>("machines")
            .updateOne(tenantFilter(adminId, "machines", { _id: new ObjectId(id) }), { $set: updates });

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({ error: "Machine not found" }, { status: 404 });
        }

        const updated = await db
            .collection<MachineDoc>("machines")
            .findOne(tenantFilter(adminId, "machines", { _id: new ObjectId(id) }));

        return NextResponse.json({
            id: updated!._id.toString(),
            machineName: updated!.machineName,
            machineType: updated!.machineType,
            capacity: updated!.capacity,
            status: updated!.status,
            adminId: updated!.adminId,
            createdAt: updated!.createdAt,
            updatedAt: updated!.updatedAt,
        });
    } catch (error: unknown) {
        console.error("Error updating machine:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ─── DELETE: Remove a machine (Admin only) ───────────────────────────
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.role !== "Admin" && user.role !== "Owner") {
            return NextResponse.json(
                { error: "Only admins can delete machines" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const db = await getDb();
        const adminId = getDataOwnerId(user);

        const result = await db.collection("machines").deleteOne(
            tenantFilter(adminId, "machines", { _id: new ObjectId(id) })
        );

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Machine not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error deleting machine:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
