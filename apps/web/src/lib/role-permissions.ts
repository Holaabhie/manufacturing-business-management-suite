/**
 * Role-based access control configuration for frontend.
 * Defines which routes and features are available for each role.
 */

export type UserRole = "Admin" | "Staff";

// Routes accessible by each role
export const ROLE_PERMISSIONS: Record<UserRole, {
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
            "/dashboard/inventory",
            "/dashboard/clients",
            "/dashboard/assistant",
            "/dashboard/profile",
        ],
        hiddenSections: ["FINANCE"], // Hide these navigation groups
        readOnlyRoutes: ["/dashboard/clients"], // Read-only access
    },
};

/**
 * Check if a route is allowed for a given role
 */
export function isRouteAllowed(role: UserRole | null, route: string): boolean {
    if (!role) return false;

    const permissions = ROLE_PERMISSIONS[role];
    if (permissions.allowedRoutes.includes("*")) return true;

    return permissions.allowedRoutes.some(
        allowed => route === allowed || route.startsWith(allowed + "/")
    );
}

/**
 * Check if a navigation section should be hidden for a role
 */
export function isSectionHidden(role: UserRole | null, section: string): boolean {
    if (!role) return true;

    const permissions = ROLE_PERMISSIONS[role];
    return permissions.hiddenSections.includes(section);
}

/**
 * Check if a route is read-only for a role
 */
export function isRouteReadOnly(role: UserRole | null, route: string): boolean {
    if (!role) return true;

    const permissions = ROLE_PERMISSIONS[role];
    return permissions.readOnlyRoutes.some(
        readOnly => route === readOnly || route.startsWith(readOnly + "/")
    );
}

/**
 * Get allowed navigation items for a role from a navigation group
 */
export function filterNavigationByRole(
    navigationGroups: Array<{
        label: string;
        items: Array<{ name: string; href: string; icon: any; badge?: number }>;
    }>,
    role: UserRole | null
): Array<{
    label: string;
    items: Array<{ name: string; href: string; icon: any; badge?: number }>;
}> {
    if (!role) return [];

    // Admin sees everything
    if (role === "Admin") return navigationGroups;

    const permissions = ROLE_PERMISSIONS[role];

    return navigationGroups
        .filter(group => !permissions.hiddenSections.includes(group.label))
        .map(group => ({
            ...group,
            items: group.items.filter(item =>
                permissions.allowedRoutes.includes("*") ||
                permissions.allowedRoutes.includes(item.href)
            ),
        }))
        .filter(group => group.items.length > 0);
}

/**
 * Get allowed mobile nav items for a role
 */
export function filterMobileNavByRole(
    mobileNavItems: Array<{ name: string; href: string; icon: any; isMore?: boolean }>,
    role: UserRole | null
): Array<{ name: string; href: string; icon: any; isMore?: boolean }> {
    if (!role) return [];

    if (role === "Admin") return mobileNavItems;

    const permissions = ROLE_PERMISSIONS[role];

    return mobileNavItems.filter(item =>
        item.isMore || // Keep "More" button
        permissions.allowedRoutes.includes("*") ||
        permissions.allowedRoutes.includes(item.href)
    );
}
