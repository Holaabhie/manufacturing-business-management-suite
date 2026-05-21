import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, type UserDoc } from "@/lib/auth-session";
import type { WithId } from "mongodb";

/**
 * IND Manager — Auth Utility Functions
 *
 * Wrappers around getSessionUser() for use in API routes.
 * Provides permission checking and role enforcement.
 */

// ─── Type: IND Manager role system ──────────────────────────────

export type IndRole = "owner" | "manager" | "staff" | "accountant";

// Extended user type with IND Manager fields
export interface IndUser {
    _id: string;
    email: string;
    name: string;
    role: IndRole;
    businessId: string;
    customPermissions?: Record<string, boolean>;
    isActive: boolean;
}

// ─── getServerSessionUser ────────────────────────────────────────

/**
 * Get the current authenticated user from the session.
 * Returns the raw UserDoc from the existing auth-session system.
 *
 * @returns The user document or null if not authenticated.
 */
export async function getServerSessionUser(): Promise<WithId<UserDoc> | null> {
    return getSessionUser();
}

// ─── requireAuth ─────────────────────────────────────────────────

/**
 * Require authentication for an API route.
 * Returns the user if authenticated, or a 401 NextResponse.
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const authResult = await requireAuth();
 *   if (authResult instanceof NextResponse) return authResult;
 *   const user = authResult;
 *   // ... use user
 * }
 * ```
 */
export async function requireAuth(): Promise<WithId<UserDoc> | NextResponse> {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized", code: "AUTH_REQUIRED" },
            { status: 401 }
        );
    }

    // Check if user account is deactivated
    if (user.status === "inactive" || user.status === "suspended") {
        return NextResponse.json(
            { error: "Account is deactivated", code: "ACCOUNT_DEACTIVATED" },
            { status: 403 }
        );
    }

    return user;
}

// ─── requireRole ─────────────────────────────────────────────────

/**
 * Require a specific role (or higher) for an API route.
 * Role hierarchy: owner > manager > accountant > staff
 *
 * @example
 * ```ts
 * export async function DELETE() {
 *   const authResult = await requireRole("manager");
 *   if (authResult instanceof NextResponse) return authResult;
 *   const user = authResult;
 *   // ... only owners and managers reach here
 * }
 * ```
 */
const ROLE_HIERARCHY: Record<string, number> = {
    owner: 100,
    Admin: 100,    // Map existing Admin role to owner level
    manager: 75,
    accountant: 50,
    staff: 25,
    Staff: 25,     // Map existing Staff role
};

export async function requireRole(
    minRole: IndRole
): Promise<WithId<UserDoc> | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const user = authResult;
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < requiredLevel) {
        return NextResponse.json(
            {
                error: "Insufficient permissions",
                code: "ROLE_INSUFFICIENT",
                required: minRole,
                current: user.role,
            },
            { status: 403 }
        );
    }

    return user;
}

// ─── requirePermission ──────────────────────────────────────────

/**
 * Require a specific permission for an API route.
 * Checks both role-based defaults and custom permission overrides.
 *
 * @param permission - Dot-notation permission key (e.g. "invoices.create")
 *
 * @example
 * ```ts
 * export async function POST() {
 *   const authResult = await requirePermission("invoices.create");
 *   if (authResult instanceof NextResponse) return authResult;
 *   const user = authResult;
 *   // ... user has invoices.create permission
 * }
 * ```
 */
export async function requirePermission(
    permission: string
): Promise<WithId<UserDoc> | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const user = authResult;
    const allowed = await hasPermission(String(user._id), permission);

    if (!allowed) {
        return NextResponse.json(
            {
                error: "Permission denied",
                code: "PERMISSION_DENIED",
                required: permission,
            },
            { status: 403 }
        );
    }

    return user;
}

// ─── hasPermission ──────────────────────────────────────────────

/**
 * Check if a user has a specific permission.
 *
 * Resolution order:
 * 1. Check `customPermissions` on the user doc (explicit override)
 * 2. Fall back to role-based defaults
 *
 * Owners always have all permissions.
 */
export async function hasPermission(
    userId: string,
    permission: string
): Promise<boolean> {
    try {
        const db = await getDb();
        const user = await db.collection("users").findOne({
            _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId as any,
        });

        if (!user) return false;
        if (!user.isActive && user.isActive !== undefined) return false;

        // Owners / Admins always have full access
        if (user.role === "owner" || user.role === "Admin") return true;

        // Check custom permission overrides first
        const customPerms = user.customPermissions as Record<string, boolean> | undefined;
        if (customPerms && permission in customPerms) {
            return customPerms[permission];
        }

        // Check existing RBAC permissions if available
        const existingPerms = user.permissions as Record<string, unknown> | undefined;
        if (existingPerms) {
            // Navigate dot-notation: "invoices.create" → permissions.invoices.create
            const parts = permission.split(".");
            let current: any = existingPerms;
            for (const part of parts) {
                if (current && typeof current === "object" && part in current) {
                    current = current[part];
                } else {
                    current = undefined;
                    break;
                }
            }
            if (typeof current === "boolean") return current;
        }

        // Fall back to role-based defaults
        return getDefaultPermission(user.role as string, permission);
    } catch (err) {
        console.error("[auth-utils] hasPermission error:", err instanceof Error ? err.message : err);
        return false;
    }
}

// ─── Default role permissions ────────────────────────────────────

const ROLE_DEFAULTS: Record<string, Set<string>> = {
    manager: new Set([
        "orders.create", "orders.read", "orders.update", "orders.delete",
        "invoices.create", "invoices.read", "invoices.update", "invoices.send",
        "inventory.create", "inventory.read", "inventory.update", "inventory.delete",
        "production.create", "production.read", "production.update",
        "payments.create", "payments.read",
        "clients.create", "clients.read", "clients.update",
        "reports.read",
    ]),
    accountant: new Set([
        "orders.read",
        "invoices.create", "invoices.read", "invoices.update", "invoices.send",
        "payments.create", "payments.read", "payments.update",
        "reports.read",
        "clients.read",
    ]),
    staff: new Set([
        "orders.read",
        "inventory.read",
        "production.read", "production.update",
    ]),
};

function getDefaultPermission(role: string, permission: string): boolean {
    const defaults = ROLE_DEFAULTS[role];
    if (!defaults) return false;
    return defaults.has(permission);
}

// ─── getBusinessId ───────────────────────────────────────────────

/**
 * Get the business ID for the current user.
 * Works with both the new IND Manager businessId field
 * and the existing organizationId / adminId pattern.
 */
export function getBusinessId(user: WithId<UserDoc>): string {
    // Try new IND Manager field first
    const bizId = (user as any).businessId;
    if (bizId) return String(bizId);

    // Fall back to existing organization pattern
    if (user.organizationId) return user.organizationId;

    // Staff users use their admin's ID
    if (user.role === "Staff" && user.adminId) return user.adminId;

    // Owner/Admin — use their own ID
    return String(user._id);
}
