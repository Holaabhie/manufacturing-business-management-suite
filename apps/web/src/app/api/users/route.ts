import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - List all users (Admin only)
export async function GET() {
    try {
        const result = await requireAdmin();
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status || 401 });
        }
        const user = result.user;

        const dataOwnerId = getDataOwnerId(user);
        const ownerOid = ObjectId.isValid(dataOwnerId) ? new ObjectId(dataOwnerId) : null;
        const userOid = ObjectId.isValid(String(user._id)) ? new ObjectId(String(user._id)) : null;

        const db = await getDb();
        const users = await db
            .collection("users")
            .find({
                $or: [
                    { adminId: dataOwnerId },
                    { _id: (userOid || user._id) as unknown as ObjectId },
                    ...(ownerOid ? [{ _id: ownerOid }] : []),
                ],
            }, {
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
    } catch (error: unknown) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
