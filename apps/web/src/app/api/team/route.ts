import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { resolvePermissions, countPermissions, type FlatPermissionMap } from "@/lib/permissions";

/**
 * GET /api/team
 * List all users in business with their roles + permissions
 */
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const dataOwnerId = getDataOwnerId(user);

        // Find all users that belong to this admin's team
        // Admin/Owner sees staff they created (adminId match) + themselves
        // Staff sees other staff under same admin
        const members = await db
            .collection("users")
            .find({
                $or: [
                    { _id: dataOwnerId as any },
                    { adminId: dataOwnerId },
                    { organizationId: user.organizationId, ...(user.organizationId ? {} : { _id: { $exists: false } }) },
                ],
            })
            .project({
                password: 0,
                passwordHash: 0,
                otpSecret: 0,
                googleId: 0,
                microsoftId: 0,
            })
            .sort({ role: 1, createdAt: 1 })
            .toArray();

        // Also fetch pending invitations
        const invitations = await db
            .collection("invitations")
            .find({
                $or: [
                    { invitedBy: String(user._id) },
                    { organizationId: user.organizationId },
                ],
                status: "pending",
            })
            .sort({ createdAt: -1 })
            .toArray();

        const formattedMembers = members.map((m: any) => {
            const resolved = resolvePermissions(m.role, m.customPermissions);
            return {
                id: String(m._id),
                fullName: m.fullName || m.full_name || "Unknown",
                email: m.email || "",
                phone: m.phone || m.phone_number || "",
                avatar_url: m.avatar_url || null,
                role: m.role || "Staff",
                customPermissions: m.customPermissions || null,
                resolvedPermissions: resolved,
                permissionCount: countPermissions(resolved),
                lastActiveAt: m.lastActiveAt || m.lastLogin || null,
                isActive: m.isActive !== false,
                status: m.status || "active",
                department: m.department || null,
                employeeId: m.employeeId || null,
                createdAt: m.createdAt,
            };
        });

        const formattedInvitations = invitations.map((inv: any) => ({
            id: String(inv._id),
            email: inv.email,
            role: inv.role,
            status: inv.status,
            invitedByName: inv.invitedByName,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
        }));

        return NextResponse.json({
            members: formattedMembers,
            pendingInvitations: formattedInvitations,
        });
    } catch (error: any) {
        console.error("[team GET] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
