/**
 * Role-based access control configuration for frontend.
 * 
 * This module provides BOTH the legacy route-based filtering (for backward
 * compatibility with existing navigation) AND the new granular permission
 * system integration.
 * 
 * For new code, prefer using the granular permission system from
 * `@/lib/permissions` and the `usePermissions()` hook.
 */

import {
    type FlatPermissionMap,
    type RoleType,
    normalizeRoleType,
    isOwnerRole,
    canView,
    hasModuleAccess,
    canAccessRoute as granularCanAccessRoute,
    MODULE_ROUTE_MAP,
} from "@/lib/permissions";

export type UserRole = "Admin" | "Owner" | "Manager" | "Staff" | "Accountant" | string;

export function normalizeRole(role: string | null): UserRole | null {
    if (!role) return null;
    const lower = role.toLowerCase();
    if (lower === "admin" || lower === "owner") return "Owner";
    if (lower === "manager") return "Manager";
    if (lower === "staff") return "Staff";
    if (lower === "accountant") return "Accountant";
    return role as UserRole;
}

// ─── Legacy Route-Based Permissions (kept for backward compat) ──
export const ROLE_PERMISSIONS: Record<string, {
    allowedRoutes: string[];
    hiddenSections: string[];
    readOnlyRoutes: string[];
}> = {
    Owner: {
        allowedRoutes: ["*"], // All routes
        hiddenSections: [], // Nothing hidden
        readOnlyRoutes: [], // Full access
    },
    Admin: {
        allowedRoutes: ["*"],
        hiddenSections: [],
        readOnlyRoutes: [],
    },
    Manager: {
        allowedRoutes: [
            "/dashboard",
            "/dashboard/dashboard",
            "/dashboard/orders",
            "/dashboard/production",
            "/dashboard/machines",
            "/dashboard/inventory",
            "/dashboard/clients",
            "/dashboard/purchasing",
            "/dashboard/profile",
        ],
        hiddenSections: ["FINANCE", "INTELLIGENCE", "SYSTEM"],
        readOnlyRoutes: [],
    },
    Staff: {
        allowedRoutes: [
            "/dashboard",
            "/dashboard/dashboard",
            "/dashboard/orders",
            "/dashboard/production",
            "/dashboard/machines",
            "/dashboard/inventory",
            "/dashboard/purchasing",
            "/dashboard/folio",
            "/dashboard/profile",
        ],
        hiddenSections: ["FINANCE", "INTELLIGENCE", "SYSTEM", "RELATIONSHIPS"], // Hide these navigation groups
        readOnlyRoutes: [], // No read-only routes
    },
    Accountant: {
        allowedRoutes: [
            "/dashboard",
            "/dashboard/dashboard",
            "/dashboard/orders",
            "/dashboard/billing",
            "/dashboard/payments",
            "/dashboard/analytics",
            "/dashboard/profile",
        ],
        hiddenSections: ["OPERATIONS", "INTELLIGENCE", "SYSTEM"],
        readOnlyRoutes: ["/dashboard/orders"],
    },
};

/**
 * Check if a route is allowed for a given role.
 * Enhanced: If granular permissions are provided, uses those instead.
 */
export function isRouteAllowed(
    rawRole: UserRole | null,
    route: string,
    permissions?: FlatPermissionMap | null
): boolean {
    const role = normalizeRole(rawRole);
    if (!role) return false;

    // If granular permissions available, use them
    if (permissions && !isOwnerRole(role)) {
        return granularCanAccessRoute(permissions, route, false);
    }

    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["Staff"];
    if (perms.allowedRoutes.includes("*")) return true;

    return perms.allowedRoutes.some(
        allowed => route === allowed || route.startsWith(allowed + "/")
    );
}

/**
 * Check if a navigation section should be hidden for a role.
 * Enhanced: If granular permissions are provided, hides sections
 * where the user has no view access to any module in that section.
 */
export function isSectionHidden(
    rawRole: UserRole | null,
    section: string,
    permissions?: FlatPermissionMap | null
): boolean {
    const role = normalizeRole(rawRole);
    if (!role) return true;
    if (isOwnerRole(role)) return false;

    // Map section labels to permission modules
    const sectionModuleMap: Record<string, string[]> = {
        "OPERATIONS": ["orders", "production", "inventory"],
        "BUSINESS": ["clients"],
        "FINANCE": ["invoices", "reports"],
        "INTELLIGENCE": ["reports"],
        "TEAM": ["team"],
        "ADMINISTRATION": ["settings", "team", "staff"],
    };

    // If granular permissions available, check module access
    if (permissions) {
        const modules = sectionModuleMap[section];
        if (modules) {
            return !modules.some(m => hasModuleAccess(permissions, m, false));
        }
    }

    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["Staff"];
    return perms.hiddenSections.includes(section);
}

/**
 * Check if a route is read-only for a role.
 * Enhanced: With granular permissions, checks if user has view but not edit.
 */
export function isRouteReadOnly(
    rawRole: UserRole | null,
    route: string,
    permissions?: FlatPermissionMap | null
): boolean {
    const role = normalizeRole(rawRole);
    if (!role) return true;
    if (isOwnerRole(role)) return false;

    // If granular permissions available, check edit access
    if (permissions) {
        for (const [moduleId, routes] of Object.entries(MODULE_ROUTE_MAP)) {
            if (routes.some(r => route === r || route.startsWith(r + "/"))) {
                const hasView = canView(permissions, moduleId, false);
                const hasEdit = permissions[`${moduleId}.edit`] === true || permissions[`${moduleId}.create`] === true;
                return hasView && !hasEdit;
            }
        }
    }

    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["Staff"];
    return perms.readOnlyRoutes.some(
        readOnly => route === readOnly || route.startsWith(readOnly + "/")
    );
}

/**
 * Get allowed navigation items for a role from navigation groups.
 * Enhanced: Uses granular permissions when available.
 */
export function filterNavigationByRole(
    navigationGroups: Array<{
        label: string;
        items: Array<{ name: string; href: string; icon: any; badge?: number }>;
    }>,
    rawRole: UserRole | null,
    permissions?: FlatPermissionMap | null
): Array<{
    label: string;
    items: Array<{ name: string; href: string; icon: any; badge?: number }>;
}> {
    const role = normalizeRole(rawRole);
    if (!role) return [];

    // Owner sees everything
    if (isOwnerRole(role)) return navigationGroups;

    return navigationGroups
        .filter(group => !isSectionHidden(role, group.label, permissions))
        .map(group => ({
            ...group,
            items: group.items.filter(item =>
                isRouteAllowed(role, item.href, permissions)
            ),
        }))
        .filter(group => group.items.length > 0);
}

/**
 * Get allowed mobile nav items for a role.
 * Enhanced: Uses granular permissions when available.
 */
export function filterMobileNavByRole(
    mobileNavItems: Array<{ name: string; href: string; icon: any; isMore?: boolean }>,
    rawRole: UserRole | null,
    permissions?: FlatPermissionMap | null
): Array<{ name: string; href: string; icon: any; isMore?: boolean }> {
    const role = normalizeRole(rawRole);
    if (!role) return [];

    if (isOwnerRole(role)) return mobileNavItems;

    return mobileNavItems.filter(item =>
        item.isMore || // Keep "More" button
        isRouteAllowed(role, item.href, permissions)
    );
}
