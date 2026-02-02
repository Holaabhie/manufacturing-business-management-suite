import { NextResponse } from "next/server";
import { getSessionUser, type UserDoc } from "@/lib/auth-session";
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
