/**
 * Enterprise RBAC Permission System — Flat Dot-Notation Schema
 * 
 * Permissions follow the pattern: "module.action" → boolean
 * Role presets: Owner, Manager, Staff, Accountant
 * 
 * Resolution order:
 *   1. Start with role preset
 *   2. Apply user.customPermissions on top (merge)
 *   3. customPermissions override role defaults
 *   4. Owner always has all permissions regardless
 */

// ─── Role Types ─────────────────────────────────────────────────
export type RoleType = "Owner" | "Manager" | "Staff" | "Accountant";

/** Map legacy "Admin" to "Owner" at runtime */
export function normalizeRoleType(role: string | null | undefined): RoleType | null {
    if (!role) return null;
    const lower = role.toLowerCase();
    if (lower === "admin" || lower === "owner") return "Owner";
    if (lower === "manager") return "Manager";
    if (lower === "staff") return "Staff";
    if (lower === "accountant") return "Accountant";
    return null;
}

export function isOwnerRole(role: string | null | undefined): boolean {
    if (!role) return false;
    const lower = role.toLowerCase();
    return lower === "admin" || lower === "owner";
}

// ─── Flat Permission Map Type ───────────────────────────────────
export type FlatPermissionMap = Record<string, boolean>;

// ─── Base Permission Keys (defines all possible permissions) ────
export const BASE_PERMISSIONS: FlatPermissionMap = {
    // Orders
    "orders.view": true,
    "orders.create": true,
    "orders.edit": true,
    "orders.delete": false,
    "orders.export": false,

    // Production
    "production.view": true,
    "production.create": true,
    "production.complete": true,
    "production.delete": false,

    // Clients
    "clients.view": true,
    "clients.create": true,
    "clients.edit": true,
    "clients.delete": false,

    // Inventory
    "inventory.view": true,
    "inventory.create": false,
    "inventory.edit": false,
    "inventory.delete": false,
    "inventory.restock": false,

    // Invoices
    "invoices.view": true,
    "invoices.create": false,
    "invoices.send": false,
    "invoices.delete": false,
    "invoices.markPaid": false,

    // Staff
    "staff.view": false,
    "staff.manage": false,
    "staff.salary": false,

    // Reports
    "reports.view": false,
    "reports.export": false,
    "reports.gst": false,

    // Settings
    "settings.view": false,
    "settings.edit": false,
    "settings.billing": false,

    // Team
    "team.view": false,
    "team.invite": false,
    "team.removeUser": false,
    "team.editPermissions": false,
};

// ─── All Permission Keys ────────────────────────────────────────
export const ALL_PERMISSION_KEYS = Object.keys(BASE_PERMISSIONS);

// ─── Permission Sections (for UI grouping) ──────────────────────
export interface PermissionSection {
    id: string;
    label: string;
    icon?: string;
    permissions: { key: string; label: string }[];
}

export const PERMISSION_SECTIONS: PermissionSection[] = [
    {
        id: "orders",
        label: "Orders",
        icon: "ShoppingCart",
        permissions: [
            { key: "orders.view", label: "View orders" },
            { key: "orders.create", label: "Create orders" },
            { key: "orders.edit", label: "Edit orders" },
            { key: "orders.delete", label: "Delete orders" },
            { key: "orders.export", label: "Export orders" },
        ],
    },
    {
        id: "production",
        label: "Production",
        icon: "Factory",
        permissions: [
            { key: "production.view", label: "View production runs" },
            { key: "production.create", label: "Create production runs" },
            { key: "production.complete", label: "Complete production runs" },
            { key: "production.delete", label: "Delete production runs" },
        ],
    },
    {
        id: "clients",
        label: "Clients",
        icon: "Users",
        permissions: [
            { key: "clients.view", label: "View clients" },
            { key: "clients.create", label: "Create clients" },
            { key: "clients.edit", label: "Edit clients" },
            { key: "clients.delete", label: "Delete clients" },
        ],
    },
    {
        id: "inventory",
        label: "Inventory",
        icon: "Package",
        permissions: [
            { key: "inventory.view", label: "View inventory" },
            { key: "inventory.create", label: "Add materials" },
            { key: "inventory.edit", label: "Edit materials" },
            { key: "inventory.delete", label: "Delete materials" },
            { key: "inventory.restock", label: "Restock inventory" },
        ],
    },
    {
        id: "invoices",
        label: "Invoices",
        icon: "FileText",
        permissions: [
            { key: "invoices.view", label: "View invoices" },
            { key: "invoices.create", label: "Create invoices" },
            { key: "invoices.send", label: "Send invoices" },
            { key: "invoices.delete", label: "Delete invoices" },
            { key: "invoices.markPaid", label: "Mark as paid" },
        ],
    },
    {
        id: "staff",
        label: "Staff",
        icon: "UserCog",
        permissions: [
            { key: "staff.view", label: "View staff" },
            { key: "staff.manage", label: "Manage staff" },
            { key: "staff.salary", label: "View salaries" },
        ],
    },
    {
        id: "reports",
        label: "Reports",
        icon: "BarChart3",
        permissions: [
            { key: "reports.view", label: "View reports" },
            { key: "reports.export", label: "Export reports" },
            { key: "reports.gst", label: "GST reports" },
        ],
    },
    {
        id: "settings",
        label: "Settings",
        icon: "Settings",
        permissions: [
            { key: "settings.view", label: "View settings" },
            { key: "settings.edit", label: "Edit settings" },
            { key: "settings.billing", label: "Manage billing" },
        ],
    },
    {
        id: "team",
        label: "Team",
        icon: "Users2",
        permissions: [
            { key: "team.view", label: "View team members" },
            { key: "team.invite", label: "Invite members" },
            { key: "team.removeUser", label: "Remove members" },
            { key: "team.editPermissions", label: "Edit permissions" },
        ],
    },
];

// ─── Role Presets ────────────────────────────────────────────────

function allTrue(): FlatPermissionMap {
    const map: FlatPermissionMap = {};
    for (const key of ALL_PERMISSION_KEYS) {
        map[key] = true;
    }
    return map;
}

function allFalse(): FlatPermissionMap {
    const map: FlatPermissionMap = {};
    for (const key of ALL_PERMISSION_KEYS) {
        map[key] = false;
    }
    return map;
}

export const ROLE_PRESETS: Record<RoleType, { label: string; description: string; permissions: FlatPermissionMap }> = {
    Owner: {
        label: "Owner",
        description: "Full access to everything. Cannot be restricted.",
        permissions: allTrue(),
    },
    Manager: {
        label: "Manager",
        description: "Full access to orders, production, clients, and inventory.",
        permissions: {
            ...allFalse(),
            // Orders — full
            "orders.view": true,
            "orders.create": true,
            "orders.edit": true,
            "orders.delete": true,
            "orders.export": true,
            // Production — full
            "production.view": true,
            "production.create": true,
            "production.complete": true,
            "production.delete": true,
            // Clients — full
            "clients.view": true,
            "clients.create": true,
            "clients.edit": true,
            "clients.delete": true,
            // Inventory — full
            "inventory.view": true,
            "inventory.create": true,
            "inventory.edit": true,
            "inventory.delete": true,
            "inventory.restock": true,
        },
    },
    Staff: {
        label: "Staff",
        description: "View orders, create and complete production runs.",
        permissions: {
            ...allFalse(),
            "orders.view": true,
            "production.view": true,
            "production.create": true,
            "production.complete": true,
        },
    },
    Accountant: {
        label: "Accountant",
        description: "Full access to invoices and reports. View-only orders.",
        permissions: {
            ...allFalse(),
            // Invoices — full
            "invoices.view": true,
            "invoices.create": true,
            "invoices.send": true,
            "invoices.delete": true,
            "invoices.markPaid": true,
            // Reports — full
            "reports.view": true,
            "reports.export": true,
            "reports.gst": true,
            // Orders — view only
            "orders.view": true,
        },
    },
};

// ─── Permission Resolution ──────────────────────────────────────

/**
 * Resolve effective permissions for a user.
 * 
 * 1. Start with role preset
 * 2. Apply customPermissions on top (merge/override)
 * 3. Owner always has all permissions regardless
 */
export function resolvePermissions(
    role: string | null | undefined,
    customPermissions?: FlatPermissionMap | null
): FlatPermissionMap {
    const normalizedRole = normalizeRoleType(role);

    // Owner/Admin always has everything
    if (normalizedRole === "Owner") {
        return { ...allTrue() };
    }

    // Start with role preset or base permissions
    const rolePreset = normalizedRole
        ? ROLE_PRESETS[normalizedRole]?.permissions
        : BASE_PERMISSIONS;

    const base = { ...rolePreset };

    // Merge custom permissions on top
    if (customPermissions) {
        for (const [key, value] of Object.entries(customPermissions)) {
            if (key in base) {
                base[key] = value;
            }
        }
    }

    return base;
}

// ─── Permission Checking Utilities ──────────────────────────────

/**
 * Check if a user has a specific permission using flat key.
 * 
 * @param permissions - The user's resolved permission map
 * @param key - Permission key (e.g., "orders.create")
 * @param isOwner - Whether the user is Owner/Admin (bypasses all checks)
 */
export function hasPermission(
    permissions: FlatPermissionMap | null | undefined,
    key: string,
    isOwner: boolean = false
): boolean {
    if (isOwner) return true;
    if (!permissions) return false;
    return permissions[key] === true;
}

/**
 * Check if a user has ANY permission in a module (used for navigation).
 */
export function hasModuleAccess(
    permissions: FlatPermissionMap | null | undefined,
    moduleId: string,
    isOwner: boolean = false
): boolean {
    if (isOwner) return true;
    if (!permissions) return false;

    const prefix = `${moduleId}.`;
    return Object.entries(permissions).some(
        ([key, value]) => key.startsWith(prefix) && value === true
    );
}

/**
 * Check if a user has view permission for a module.
 */
export function canView(
    permissions: FlatPermissionMap | null | undefined,
    moduleId: string,
    isOwner: boolean = false
): boolean {
    return hasPermission(permissions, `${moduleId}.view`, isOwner);
}

/**
 * Count how many permissions are granted (true).
 */
export function countPermissions(permissions: FlatPermissionMap | null | undefined): number {
    if (!permissions) return 0;
    return Object.values(permissions).filter(v => v === true).length;
}

/**
 * Get a flat list of all granted permission keys.
 */
export function getGrantedPermissions(permissions: FlatPermissionMap | null | undefined): string[] {
    if (!permissions) return [];
    return Object.entries(permissions)
        .filter(([, value]) => value === true)
        .map(([key]) => key);
}

// ─── Module to Route Mapping ────────────────────────────────────
export const MODULE_ROUTE_MAP: Record<string, string[]> = {
    orders: ["/dashboard/orders"],
    production: ["/dashboard/production"],
    inventory: ["/dashboard/inventory"],
    clients: ["/dashboard/clients"],
    invoices: ["/dashboard/billing", "/dashboard/payments"],
    staff: ["/dashboard/users"],
    reports: ["/dashboard/analytics"],
    settings: ["/dashboard/settings", "/dashboard/profile"],
    team: ["/dashboard/settings/team"],
};

/**
 * Get the required module for a given route.
 */
export function getModuleForRoute(route: string): string | null {
    for (const [moduleId, routes] of Object.entries(MODULE_ROUTE_MAP)) {
        if (routes.some(r => route === r || route.startsWith(r + "/"))) {
            return moduleId;
        }
    }
    // Dashboard home is accessible to all authenticated users
    if (route === "/dashboard") return null;
    return null;
}

/**
 * Check if a user can access a route based on their permissions.
 */
export function canAccessRoute(
    permissions: FlatPermissionMap | null | undefined,
    route: string,
    isOwner: boolean = false
): boolean {
    if (isOwner) return true;

    const moduleId = getModuleForRoute(route);
    if (!moduleId) return true; // No specific module required (e.g., dashboard home)

    return canView(permissions, moduleId, isOwner);
}

// ─── Backward Compatibility ─────────────────────────────────────
// These types are kept so existing imports don't break immediately.
// They delegate to the new flat format internally.

export type PermissionModule = string;
export type PermissionMap = FlatPermissionMap;

/** @deprecated Use allTrue() */
export const ADMIN_PERMISSIONS: FlatPermissionMap = allTrue();

/** @deprecated Use allFalse() */
export const EMPTY_PERMISSIONS: FlatPermissionMap = allFalse();
