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
    type PermissionMap,
    type PermissionModule,
    ADMIN_PERMISSIONS,
    canView,
    hasModuleAccess,
    canAccessRoute as granularCanAccessRoute,
    MODULE_ROUTE_MAP,
} from "@/lib/permissions";

export type UserRole = "Admin" | "Staff" | string;

export function normalizeRole(role: string | null): UserRole | null {
    if (!role) return null;
    const lower = role.toLowerCase();
    if (lower === "admin") return "Admin";
    if (lower === "staff") return "Staff";
    return role as UserRole;
}

// ─── Legacy Route-Based Permissions (kept for backward compat) ──
export const ROLE_PERMISSIONS: Record<string, {
    allowedRoutes: string[];
    hiddenSections: string[];
    readOnlyRoutes: string[];
}> = {
    Admin: {
        allowedRoutes: ["*"], // All routes
        hiddenSections: [], // Nothing hidden
        readOnlyRoutes: [], // Full access
    },
    Staff: {
        allowedRoutes: [
            "/dashboard",
            "/dashboard/orders",
            "/dashboard/production",
            "/dashboard/inventory",
            "/dashboard/purchasing",
            "/dashboard/profile",
        ],
        hiddenSections: ["FINANCE", "INTELLIGENCE", "SYSTEM", "RELATIONSHIPS"], // Hide these navigation groups
        readOnlyRoutes: [], // No read-only routes
    },
};

/**
 * Check if a route is allowed for a given role.
 * Enhanced: If granular permissions are provided, uses those instead.
 */
export function isRouteAllowed(
    rawRole: UserRole | null,
    route: string,
    permissions?: PermissionMap | null
): boolean {
    const role = normalizeRole(rawRole);
    if (!role) return false;

    // If granular permissions available, use them
    if (permissions && role !== "Admin") {
        return granularCanAccessRoute(permissions, route, false);
    }

    const perms = ROLE_PERMISSIONS[role];
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
    permissions?: PermissionMap | null
): boolean {
    const role = normalizeRole(rawRole);
    if (!role) return true;
    if (role === "Admin") return false;

    // Map section labels to permission modules
    const sectionModuleMap: Record<string, PermissionModule[]> = {
        "OPERATIONS": ["orders", "production", "inventory"],
        "BUSINESS": ["clients"],
        "FINANCE": ["finance"],
        "INTELLIGENCE": ["assistant"],
        "TEAM": ["team"],
        "ADMINISTRATION": ["settings", "audit", "team"],
    };

    // If granular permissions available, check module access
    if (permissions) {
        const modules = sectionModuleMap[section];
        if (modules) {
            return !modules.some(m => hasModuleAccess(permissions, m, false));
        }
    }

    const perms = ROLE_PERMISSIONS[role];
    return perms.hiddenSections.includes(section);
}

/**
 * Check if a route is read-only for a role.
 * Enhanced: With granular permissions, checks if user has view but not edit.
 */
export function isRouteReadOnly(
    rawRole: UserRole | null,
    route: string,
    permissions?: PermissionMap | null
): boolean {
    const role = normalizeRole(rawRole);
    if (!role) return true;
    if (role === "Admin") return false;

    // If granular permissions available, check edit access
    if (permissions) {
        // Find the module for this route
        for (const [module, routes] of Object.entries(MODULE_ROUTE_MAP)) {
            if (routes.some(r => route === r || route.startsWith(r + "/"))) {
                const mod = module as PermissionModule;
                const hasView = canView(permissions, mod, false);
                const modulePerms = permissions[mod] as Record<string, boolean>;
                const hasEdit = modulePerms?.edit === true || modulePerms?.create === true;
                return hasView && !hasEdit;
            }
        }
    }

    const perms = ROLE_PERMISSIONS[role];
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
    permissions?: PermissionMap | null
): Array<{
    label: string;
    items: Array<{ name: string; href: string; icon: any; badge?: number }>;
}> {
    const role = normalizeRole(rawRole);
    if (!role) return [];

    // Admin sees everything
    if (role === "Admin") return navigationGroups;

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
    permissions?: PermissionMap | null
): Array<{ name: string; href: string; icon: any; isMore?: boolean }> {
    const role = normalizeRole(rawRole);
    if (!role) return [];

    if (role === "Admin") return mobileNavItems;

    return mobileNavItems.filter(item =>
        item.isMore || // Keep "More" button
        isRouteAllowed(role, item.href, permissions)
    );
}
