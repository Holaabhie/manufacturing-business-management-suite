import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
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

        // Fetch target user first to verify tenant membership
        const targetUser = await db.collection("users").findOne({ _id: new ObjectId(id) });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Tenant isolation: verify target user belongs to same organization
        const dataOwnerId = getDataOwnerId(result.user);
        const isSameTeam =
            targetUser.adminId === dataOwnerId ||
            String(targetUser._id) === dataOwnerId;
        if (!isSameTeam) {
            return NextResponse.json(
                { error: "Forbidden - User does not belong to your organization" },
                { status: 403 }
            );
        }

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
