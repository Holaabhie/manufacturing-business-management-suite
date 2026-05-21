import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { isOwnerRole, hasPermission, resolvePermissions, type FlatPermissionMap, countPermissions } from "@/lib/permissions";

/**
 * PUT /api/team/[userId]/permissions
 * Update a user's custom permission overrides
 * 
 * Body: { customPermissions: { "orders.delete": true, ... } }
 * 
 * Merges into the user's existing customPermissions field.
 * Only Owner or users with team.editPermissions can call this.
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
        const { customPermissions } = body;

        if (!customPermissions || typeof customPermissions !== "object") {
            return NextResponse.json(
                { error: "customPermissions object is required" },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Find the target user
        const targetUser = await db.collection("users").findOne({ _id: userId as any });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent non-owners from modifying owner permissions
        if (isOwnerRole(targetUser.role) && !isOwner) {
            return NextResponse.json(
                { error: "Only owners can modify other owner accounts" },
                { status: 403 }
            );
        }

        // Merge new permissions into existing customPermissions
        const existingCustom = (targetUser.customPermissions || {}) as FlatPermissionMap;
        const mergedCustom: FlatPermissionMap = {
            ...existingCustom,
            ...customPermissions,
        };

        // Update via native MongoDB driver ($set) — no markModified needed
        await db.collection("users").updateOne(
            { _id: userId as any },
            {
                $set: {
                    customPermissions: mergedCustom,
                    updatedAt: new Date(),
                },
            }
        );

        // Resolve the final effective permissions
        const resolvedPermissions = resolvePermissions(targetUser.role, mergedCustom);

        return NextResponse.json({
            success: true,
            customPermissions: mergedCustom,
            resolvedPermissions,
            permissionCount: countPermissions(resolvedPermissions),
        });
    } catch (error: any) {
        console.error("[team/userId/permissions PUT] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
