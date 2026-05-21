import { NextResponse } from "next/server";
import { getSessionUser, type UserDoc } from "@/lib/auth-session";
import { hasPermission, isOwnerRole, resolvePermissions, type FlatPermissionMap } from "@/lib/permissions";
import type { WithId } from "mongodb";

export type RoleCheckResult =
    | { user: WithId<UserDoc>; error?: never; status?: never }
    | { user?: never; error: string; status: number };

/**
 * Check if the current user has one of the allowed roles.
 * Returns the user if authorized, or an error object if not.
 * 
 * Usage:
 * ```typescript
 * const result = await requireRole(["Owner", "Manager"]);
 * if (result.error) {
 *   return NextResponse.json({ error: result.error }, { status: result.status });
 * }
 * const user = result.user;
 * ```
 */
export async function requireRole(allowedRoles: string[]): Promise<RoleCheckResult> {
    const user = await getSessionUser();

    if (!user) {
        return { error: "Unauthorized - Please log in", status: 401 };
    }

    // Normalize: Admin === Owner
    const normalizedUserRole = user.role === "Admin" ? "Owner" : user.role;
    const normalizedAllowed = allowedRoles.map(r => r === "Admin" ? "Owner" : r);

    if (!normalizedAllowed.includes(normalizedUserRole)) {
        return {
            error: `Forbidden - This action requires ${allowedRoles.join(" or ")} role`,
            status: 403
        };
    }

    return { user };
}

/**
 * Check if the current user has a specific granular permission.
 * Owner/Admin always passes. Others check against their resolved permission map.
 * 
 * Usage:
 * ```typescript
 * const result = await requirePermission("orders.create");
 * if (result.error) {
 *   return NextResponse.json({ error: result.error }, { status: result.status });
 * }
 * const user = result.user;
 * ```
 */
export async function requirePermission(
    permissionKey: string
): Promise<RoleCheckResult> {
    const user = await getSessionUser();

    if (!user) {
        return { error: "Unauthorized - Please log in", status: 401 };
    }

    const isOwner = isOwnerRole(user.role);
    if (isOwner) return { user };

    const resolved = resolvePermissions(user.role, user.customPermissions as FlatPermissionMap);

    if (!hasPermission(resolved, permissionKey, false)) {
        return {
            error: `Forbidden - You don't have ${permissionKey} permission`,
            status: 403
        };
    }

    return { user };
}

/**
 * Check if the current user belongs to a specific organization.
 * Enforces multi-tenancy at the API level.
 */
export async function requireOrganization(
    organizationId?: string
): Promise<RoleCheckResult> {
    const user = await getSessionUser();

    if (!user) {
        return { error: "Unauthorized - Please log in", status: 401 };
    }

    const userOrgId = (user as any).organizationId;
    if (organizationId && userOrgId !== organizationId) {
        return { error: "Forbidden - Access denied for this organization", status: 403 };
    }

    return { user };
}

/**
 * Combined check: authentication + role + permission + organization.
 * The most comprehensive guard for API routes.
 */
export async function requireAccess(options: {
    roles?: string[];
    permission?: string;
    organizationId?: string;
}): Promise<RoleCheckResult> {
    const user = await getSessionUser();

    if (!user) {
        return { error: "Unauthorized - Please log in", status: 401 };
    }

    // Check role
    if (options.roles) {
        const normalizedUserRole = user.role === "Admin" ? "Owner" : user.role;
        const normalizedAllowed = options.roles.map(r => r === "Admin" ? "Owner" : r);

        if (!normalizedAllowed.includes(normalizedUserRole)) {
            return {
                error: `Forbidden - This action requires ${options.roles.join(" or ")} role`,
                status: 403
            };
        }
    }

    // Check organization
    if (options.organizationId) {
        const userOrgId = (user as any).organizationId;
        if (userOrgId !== options.organizationId) {
            return { error: "Forbidden - Access denied for this organization", status: 403 };
        }
    }

    // Check granular permission
    if (options.permission) {
        const isOwner = isOwnerRole(user.role);
        if (!isOwner) {
            const resolved = resolvePermissions(user.role, user.customPermissions as FlatPermissionMap);
            if (!hasPermission(resolved, options.permission, false)) {
                return {
                    error: `Forbidden - You don't have ${options.permission} permission`,
                    status: 403
                };
            }
        }
    }

    return { user };
}

/**
 * Helper to create a 403 Forbidden response
 */
export function forbiddenResponse(message?: string) {
    return NextResponse.json(
        { error: message || "Forbidden - Insufficient permissions" },
        { status: 403 }
    );
}

/**
 * Helper to create a 401 Unauthorized response
 */
export function unauthorizedResponse(message?: string) {
    return NextResponse.json(
        { error: message || "Unauthorized - Please log in" },
        { status: 401 }
    );
}

/**
 * Check if user is Owner/Admin
 */
export async function requireAdmin(): Promise<RoleCheckResult> {
    return requireRole(["Owner", "Admin"]);
}

/**
 * Check if user is at least Staff (all roles pass)
 */
export async function requireStaffOrAdmin(): Promise<RoleCheckResult> {
    return requireRole(["Owner", "Admin", "Manager", "Staff", "Accountant"]);
}
