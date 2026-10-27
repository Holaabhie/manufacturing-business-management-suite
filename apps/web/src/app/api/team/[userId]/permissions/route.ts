import { ObjectId } from "mongodb";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import {
    isOwnerRole,
    hasPermission,
    resolvePermissions,
    type FlatPermissionMap,
    countPermissions,
    getCallerRoleRank,
    getTargetRoleRank,
    ALL_PERMISSION_KEYS
} from "@/lib/permissions";

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

        // Validate caller role rank strictly (fail-closed for invalid/corrupted roles)
        const callerRank = getCallerRoleRank(user.role);
        if (callerRank === -1) {
            return NextResponse.json(
                { error: "Forbidden - Your user account role is unrecognized or invalid" },
                { status: 403 }
            );
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

        // Prevent self-modification of permissions
        if (String(user._id) === userId) {
            return NextResponse.json(
                { error: "You cannot modify your own permissions" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { customPermissions } = body;

        if (!customPermissions || typeof customPermissions !== "object") {
            return NextResponse.json(
                { error: "customPermissions object is required" },
                { status: 400 }
            );
        }

        // Privilege delegation check: non-owners cannot grant permissions they do not possess
        if (!isOwner) {
            const callerPermissions = resolvePermissions(user.role, user.customPermissions as FlatPermissionMap);
            for (const [key, val] of Object.entries(customPermissions)) {
                if (!ALL_PERMISSION_KEYS.includes(key)) {
                    return NextResponse.json(
                        { error: `Invalid permission key '${key}'` },
                        { status: 400 }
                    );
                }
                if (val === true && !callerPermissions[key]) {
                    return NextResponse.json(
                        { error: `Forbidden - You cannot grant permission '${key}' which you do not possess` },
                        { status: 403 }
                    );
                }
            }
        }

        const db = await getDb();

        // Find the target user
        const targetUser = await db.collection("users").findOne({ _id: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId) as unknown as ObjectId });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Tenant isolation: verify target user belongs to same organization
        const dataOwnerId = getDataOwnerId(user);
        const isSameTeam =
            targetUser.adminId === dataOwnerId ||
            String(targetUser._id) === dataOwnerId ||
            Boolean(user.organizationId && targetUser.organizationId === user.organizationId);
        if (!isSameTeam) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Rank hierarchy enforcement: caller rank must be strictly higher than target user rank
        if (!isOwner) {
            const targetRank = getTargetRoleRank(targetUser.role);
            if (callerRank <= targetRank) {
                return NextResponse.json(
                    { error: "Forbidden - You can only modify permissions for roles lower than your own" },
                    { status: 403 }
                );
            }
        }

        // Prevent non-owners from modifying owner permissions (defense-in-depth)
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
            { _id: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId) as unknown as ObjectId },
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
    } catch (error: unknown) {
        console.error("[team/userId/permissions PUT] Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
