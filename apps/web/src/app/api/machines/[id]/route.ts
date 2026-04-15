import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

        if (user.role !== "Admin") {
            return NextResponse.json(
                { error: "Only admins can update machines" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const db = await getDb();
        const adminId = getDataOwnerId(user);

        const existing = await db.collection("machines").findOne({
            _id: new ObjectId(id),
            adminId,
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Machine not found" },
                { status: 404 }
            );
        }

        const updates: any = { updatedAt: new Date() };

        if (body.machineName !== undefined) {
            const name = body.machineName.trim();
            if (!name) {
                return NextResponse.json(
                    { error: "Machine name is required" },
                    { status: 400 }
                );
            }
            // Check duplicate (excluding current)
            const dup = await db.collection("machines").findOne({
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

        await db
            .collection("machines")
            .updateOne({ _id: new ObjectId(id) }, { $set: updates });

        const updated = await db
            .collection("machines")
            .findOne({ _id: new ObjectId(id) });

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
    } catch (error: any) {
        console.error("Error updating machine:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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

        if (user.role !== "Admin") {
            return NextResponse.json(
                { error: "Only admins can delete machines" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const db = await getDb();
        const adminId = getDataOwnerId(user);

        const result = await db.collection("machines").deleteOne({
            _id: new ObjectId(id),
            adminId,
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Machine not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting machine:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
