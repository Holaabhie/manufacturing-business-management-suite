import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, destroyAllUserSessions } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { isOwnerRole, hasPermission, resolvePermissions, type FlatPermissionMap } from "@/lib/permissions";

/**
 * PUT /api/team/[userId]
 * Update user role and/or custom permissions
 * 
 * Body: { role?, customPermissions? }
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check permission: Owner or team.editPermissions
        const isOwner = isOwnerRole(user.role);
        if (!isOwner) {
            const resolved = resolvePermissions(user.role, user.customPermissions as FlatPermissionMap);
            if (!hasPermission(resolved, "team.editPermissions", false)) {
                return NextResponse.json(
                    { error: "Forbidden - You don't have team.editPermissions permission" },
                    { status: 403 }
                );
            }
        }

        const { userId } = await params;
        const body = await request.json();
        const { role, customPermissions } = body;

        const db = await getDb();

        // Find the target user
        const targetUser = await db.collection("users").findOne({ _id: userId as any });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent non-owners from modifying owner accounts
        if (isOwnerRole(targetUser.role) && !isOwner) {
            return NextResponse.json(
                { error: "Only owners can modify other owner accounts" },
                { status: 403 }
            );
        }

        // Build update
        const update: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (role) {
            const validRoles = ["Owner", "Manager", "Staff", "Accountant"];
            if (!validRoles.includes(role)) {
                return NextResponse.json(
                    { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
                    { status: 400 }
                );
            }
            update.role = role;
        }

        if (customPermissions !== undefined) {
            update.customPermissions = customPermissions;
        }

        await db.collection("users").updateOne(
            { _id: userId as any },
            { $set: update }
        );

        // Return the resolved permissions with the new role/customPermissions
        const newRole = role || targetUser.role;
        const newCustom = customPermissions !== undefined ? customPermissions : targetUser.customPermissions;
        const resolved = resolvePermissions(newRole, newCustom);

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                role: newRole,
                customPermissions: newCustom,
                resolvedPermissions: resolved,
            },
        });
    } catch (error: any) {
        console.error("[team/userId PUT] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/team/[userId]
 * Deactivate user (isActive: false) and invalidate their sessions
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check permission: Owner or team.removeUser
        const isOwner = isOwnerRole(user.role);
        if (!isOwner) {
            const resolved = resolvePermissions(user.role, user.customPermissions as FlatPermissionMap);
            if (!hasPermission(resolved, "team.removeUser", false)) {
                return NextResponse.json(
                    { error: "Forbidden - You don't have team.removeUser permission" },
                    { status: 403 }
                );
            }
        }

        const { userId } = await params;

        // Can't deactivate yourself
        if (String(user._id) === userId) {
            return NextResponse.json(
                { error: "You cannot deactivate your own account" },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Find the target user
        const targetUser = await db.collection("users").findOne({ _id: userId as any });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent non-owners from deactivating owner accounts
        if (isOwnerRole(targetUser.role) && !isOwner) {
            return NextResponse.json(
                { error: "Only owners can deactivate other owner accounts" },
                { status: 403 }
            );
        }

        // Deactivate user
        await db.collection("users").updateOne(
            { _id: userId as any },
            {
                $set: {
                    isActive: false,
                    status: "inactive",
                    updatedAt: new Date(),
                },
            }
        );

        // Invalidate all their sessions
        await destroyAllUserSessions(userId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[team/userId DELETE] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
