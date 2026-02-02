import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-role";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PUT - Update user role (Admin only)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { id } = await params;
        const body = await request.json();
        const newRole = body.role;

        if (!["Admin", "Staff"].includes(newRole)) {
            return NextResponse.json(
                { error: "Invalid role. Must be 'Admin' or 'Staff'" },
                { status: 400 }
            );
        }

        // Prevent changing own role
        if (result.user._id.toString() === id) {
            return NextResponse.json(
                { error: "You cannot change your own role" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const updateResult = await db.collection("users").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    role: newRole,
                    updatedAt: new Date()
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, role: newRole });
    } catch (error: any) {
        console.error("Error updating user role:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
