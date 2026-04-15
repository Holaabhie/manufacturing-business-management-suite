import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ─── GET: List all machines for the current admin ────────────────────
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminId = getDataOwnerId(user);

        const db = await getDb();
        const machines = await db
            .collection("machines")
            .find({ adminId })
            .sort({ createdAt: -1 })
            .toArray();

        const formatted = machines.map((m: any) => ({
            id: m._id.toString(),
            machineName: m.machineName,
            machineType: m.machineType || "",
            capacity: m.capacity || "",
            status: m.status || "active",
            adminId: m.adminId,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error("Error fetching machines:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── POST: Create a new machine (Admin only) ────────────────────────
export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.role !== "Admin") {
            return NextResponse.json(
                { error: "Only admins can create machines" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const db = await getDb();
        const adminId = getDataOwnerId(user);

        // Validation
        if (!body.machineName || !body.machineName.trim()) {
            return NextResponse.json(
                { error: "Machine name is required" },
                { status: 400 }
            );
        }

        // Check for duplicate machine name under same admin
        const existing = await db.collection("machines").findOne({
            adminId,
            machineName: body.machineName.trim(),
        });
        if (existing) {
            return NextResponse.json(
                { error: "A machine with this name already exists" },
                { status: 409 }
            );
        }

        const now = new Date();
        const machine = {
            machineName: body.machineName.trim(),
            machineType: body.machineType?.trim() || "",
            capacity: body.capacity?.trim() || "",
            status: "active" as const,
            adminId,
            createdAt: now,
            updatedAt: now,
        };

        const result = await db.collection("machines").insertOne(machine);

        return NextResponse.json({
            id: result.insertedId.toString(),
            ...machine,
        });
    } catch (error: any) {
        console.error("Error creating machine:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
