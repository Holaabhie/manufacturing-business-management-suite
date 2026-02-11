import { NextResponse } from "next/server";
import { getSessionUser, type UserDoc } from "@/lib/auth-session";
import { hasPermission, ADMIN_PERMISSIONS, type PermissionModule, type PermissionMap } from "@/lib/permissions";
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
 * const result = await requireRole(["Admin"]);
 * if (result.error) {
 *   return NextResponse.json({ error: result.error }, { status: result.status });
 * }
 * const user = result.user;
 * ```
 */
export async function requireRole(allowedRoles: ("Admin" | "Staff")[]): Promise<RoleCheckResult> {
    const user = await getSessionUser();

    if (!user) {
        return { error: "Unauthorized - Please log in", status: 401 };
    }

    if (!allowedRoles.includes(user.role)) {
        return {
            error: `Forbidden - This action requires ${allowedRoles.join(" or ")} role`,
            status: 403
        };
    }

    return { user };
}

/**
 * Check if the current user has a specific granular permission.
 * Admin always passes. Staff checks against their permission map.
 * 
 * Usage:
 * ```typescript
 * const result = await requirePermission("orders", "create");
 * if (result.error) {
 *   return NextResponse.json({ error: result.error }, { status: result.status });
 * }
 * const user = result.user;
 * ```
 */
export async function requirePermission(
    module: PermissionModule,
    action: string
): Promise<RoleCheckResult> {
    const user = await getSessionUser();

    if (!user) {
        return { error: "Unauthorized - Please log in", status: 401 };
    }

    const isAdmin = user.role === "Admin";
    const permissions: PermissionMap | undefined = isAdmin
        ? ADMIN_PERMISSIONS
        : (user as any).permissions;

    if (!hasPermission(permissions, module, action, isAdmin)) {
        return {
            error: `Forbidden - You don't have ${module}.${action} permission`,
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
    roles?: ("Admin" | "Staff")[];
    module?: PermissionModule;
    action?: string;
    organizationId?: string;
}): Promise<RoleCheckResult> {
    const user = await getSessionUser();

    if (!user) {
        return { error: "Unauthorized - Please log in", status: 401 };
    }

    // Check role
    if (options.roles && !options.roles.includes(user.role)) {
        return {
            error: `Forbidden - This action requires ${options.roles.join(" or ")} role`,
            status: 403
        };
    }

    // Check organization
    if (options.organizationId) {
        const userOrgId = (user as any).organizationId;
        if (userOrgId !== options.organizationId) {
            return { error: "Forbidden - Access denied for this organization", status: 403 };
        }
    }

    // Check granular permission
    if (options.module && options.action) {
        const isAdmin = user.role === "Admin";
        const permissions: PermissionMap | undefined = isAdmin
            ? ADMIN_PERMISSIONS
            : (user as any).permissions;

        if (!hasPermission(permissions, options.module, options.action, isAdmin)) {
            return {
                error: `Forbidden - You don't have ${options.module}.${options.action} permission`,
                status: 403
            };
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
 * Check if user is Admin
 */
export async function requireAdmin(): Promise<RoleCheckResult> {
    return requireRole(["Admin"]);
}

/**
 * Check if user is at least Staff (both Admin and Staff pass)
 */
export async function requireStaffOrAdmin(): Promise<RoleCheckResult> {
    return requireRole(["Admin", "Staff"]);
}
