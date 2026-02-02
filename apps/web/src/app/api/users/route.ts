import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-role";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - List all users (Admin only)
export async function GET() {
    try {
        const result = await requireAdmin();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const db = await getDb();
        const users = await db
            .collection("users")
            .find({}, {
                projection: {
                    passwordHash: 0 // Never return password
                }
            })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json(
            users.map((user) => ({
                id: user._id.toString(),
                email: user.email,
                role: user.role || "Staff",
                full_name: user.full_name || null,
                subscription_tier: user.subscription_tier || "starter",
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }))
        );
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
