/**
 * Enterprise RBAC Permission System
 * 
 * Defines the granular permission structure used throughout the application.
 * Permissions follow the pattern: module.action
 * 
 * Modules: orders, production, inventory, clients, finance, assistant, team, settings, audit
 * Actions: view, create, edit, delete, approve, export
 */

// ─── Permission Actions per Module ──────────────────────────────
export const PERMISSION_MODULES = {
    orders: ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const,
    production: ['view', 'create', 'edit', 'delete', 'export'] as const,
    inventory: ['view', 'create', 'edit', 'delete', 'export'] as const,
    clients: ['view', 'create', 'edit', 'delete', 'export'] as const,
    finance: ['view', 'create', 'edit', 'delete', 'export'] as const,
    assistant: ['view'] as const,
    team: ['view', 'create', 'edit', 'delete'] as const,
    settings: ['view', 'edit'] as const,
    audit: ['view', 'export'] as const,
} as const;

export type PermissionModule = keyof typeof PERMISSION_MODULES;
export type PermissionAction<M extends PermissionModule> = (typeof PERMISSION_MODULES)[M][number];

// Flat permission string format: "module.action"
export type PermissionString = {
    [M in PermissionModule]: `${M}.${PermissionAction<M>}`;
}[PermissionModule];

// ─── Permission Map (used in User/Template models) ──────────────
export interface ModulePermissions {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve?: boolean;
    export: boolean;
}

export interface PermissionMap {
    orders: ModulePermissions & { approve: boolean };
    production: Omit<ModulePermissions, 'approve'>;
    inventory: Omit<ModulePermissions, 'approve'>;
    clients: Omit<ModulePermissions, 'approve'>;
    finance: Omit<ModulePermissions, 'approve'>;
    assistant: { view: boolean };
    team: Omit<ModulePermissions, 'approve' | 'export'>;
    settings: { view: boolean; edit: boolean };
    audit: { view: boolean; export: boolean };
}

// ─── Admin Full Permissions (immutable) ─────────────────────────
export const ADMIN_PERMISSIONS: PermissionMap = {
    orders: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    production: { view: true, create: true, edit: true, delete: true, export: true },
    inventory: { view: true, create: true, edit: true, delete: true, export: true },
    clients: { view: true, create: true, edit: true, delete: true, export: true },
    finance: { view: true, create: true, edit: true, delete: true, export: true },
    assistant: { view: true },
    team: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, edit: true },
    audit: { view: true, export: true },
};

// ─── Default Permission Templates ───────────────────────────────
export const DEFAULT_TEMPLATES: Record<string, { name: string; description: string; permissions: PermissionMap }> = {
    full_access: {
        name: 'Full Access Staff',
        description: 'Full access to all operational modules. No access to Finance, Settings, or Team management.',
        permissions: {
            orders: { view: true, create: true, edit: true, delete: true, approve: false, export: true },
            production: { view: true, create: true, edit: true, delete: true, export: true },
            inventory: { view: true, create: true, edit: true, delete: true, export: true },
            clients: { view: true, create: true, edit: true, delete: true, export: true },
            finance: { view: false, create: false, edit: false, delete: false, export: false },
            assistant: { view: true },
            team: { view: true, create: false, edit: false, delete: false },
            settings: { view: false, edit: false },
            audit: { view: false, export: false },
        },
    },
    operations: {
        name: 'Operations Staff',
        description: 'Access to Orders, Production, and Inventory modules.',
        permissions: {
            orders: { view: true, create: true, edit: true, delete: false, approve: false, export: true },
            production: { view: true, create: true, edit: true, delete: false, export: true },
            inventory: { view: true, create: true, edit: true, delete: false, export: true },
            clients: { view: true, create: false, edit: false, delete: false, export: false },
            finance: { view: false, create: false, edit: false, delete: false, export: false },
            assistant: { view: true },
            team: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, edit: false },
            audit: { view: false, export: false },
        },
    },
    sales: {
        name: 'Sales Executive',
        description: 'Full access to Orders and Clients. Read-only Production and Inventory.',
        permissions: {
            orders: { view: true, create: true, edit: true, delete: false, approve: false, export: true },
            production: { view: true, create: false, edit: false, delete: false, export: false },
            inventory: { view: true, create: false, edit: false, delete: false, export: false },
            clients: { view: true, create: true, edit: true, delete: false, export: true },
            finance: { view: false, create: false, edit: false, delete: false, export: false },
            assistant: { view: true },
            team: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, edit: false },
            audit: { view: false, export: false },
        },
    },
    view_only: {
        name: 'View Only',
        description: 'Read-only access across all allowed operational modules.',
        permissions: {
            orders: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
            production: { view: true, create: false, edit: false, delete: false, export: false },
            inventory: { view: true, create: false, edit: false, delete: false, export: false },
            clients: { view: true, create: false, edit: false, delete: false, export: false },
            finance: { view: false, create: false, edit: false, delete: false, export: false },
            assistant: { view: true },
            team: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, edit: false },
            audit: { view: false, export: false },
        },
    },
};

// ─── Empty Permissions (no access) ──────────────────────────────
export const EMPTY_PERMISSIONS: PermissionMap = {
    orders: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    production: { view: false, create: false, edit: false, delete: false, export: false },
    inventory: { view: false, create: false, edit: false, delete: false, export: false },
    clients: { view: false, create: false, edit: false, delete: false, export: false },
    finance: { view: false, create: false, edit: false, delete: false, export: false },
    assistant: { view: false },
    team: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, edit: false },
    audit: { view: false, export: false },
};

// ─── Permission Checking Utilities ──────────────────────────────

/**
 * Check if a user has a specific permission.
 * Admin always returns true.
 * 
 * @param permissions - The user's permission map
 * @param module - The module to check (e.g., 'orders')
 * @param action - The action to check (e.g., 'create')
 * @param isAdmin - Whether the user is an Admin (bypasses all checks)
 */
export function hasPermission(
    permissions: PermissionMap | null | undefined,
    module: PermissionModule,
    action: string,
    isAdmin: boolean = false
): boolean {
    if (isAdmin) return true;
    if (!permissions) return false;

    const modulePerms = permissions[module];
    if (!modulePerms) return false;

    return (modulePerms as Record<string, boolean>)[action] === true;
}

/**
 * Check if a user has ANY permission for a module (used for navigation visibility).
 */
export function hasModuleAccess(
    permissions: PermissionMap | null | undefined,
    module: PermissionModule,
    isAdmin: boolean = false
): boolean {
    if (isAdmin) return true;
    if (!permissions) return false;

    const modulePerms = permissions[module];
    if (!modulePerms) return false;

    return Object.values(modulePerms).some(v => v === true);
}

/**
 * Check if a user has at least view permission for a module.
 */
export function canView(
    permissions: PermissionMap | null | undefined,
    module: PermissionModule,
    isAdmin: boolean = false
): boolean {
    return hasPermission(permissions, module, 'view', isAdmin);
}

/**
 * Check if a user can create items in a module.
 */
export function canCreate(
    permissions: PermissionMap | null | undefined,
    module: PermissionModule,
    isAdmin: boolean = false
): boolean {
    return hasPermission(permissions, module, 'create', isAdmin);
}

/**
 * Check if a user can edit items in a module.
 */
export function canEdit(
    permissions: PermissionMap | null | undefined,
    module: PermissionModule,
    isAdmin: boolean = false
): boolean {
    return hasPermission(permissions, module, 'edit', isAdmin);
}

/**
 * Check if a user can delete items in a module.
 */
export function canDelete(
    permissions: PermissionMap | null | undefined,
    module: PermissionModule,
    isAdmin: boolean = false
): boolean {
    return hasPermission(permissions, module, 'delete', isAdmin);
}

/**
 * Check if a user can export data from a module.
 */
export function canExport(
    permissions: PermissionMap | null | undefined,
    module: PermissionModule,
    isAdmin: boolean = false
): boolean {
    return hasPermission(permissions, module, 'export', isAdmin);
}

/**
 * Get a flat list of all permission strings the user has.
 * Useful for token embedding.
 */
export function flattenPermissions(permissions: PermissionMap): PermissionString[] {
    const result: PermissionString[] = [];

    for (const [module, actions] of Object.entries(permissions)) {
        for (const [action, granted] of Object.entries(actions)) {
            if (granted) {
                result.push(`${module}.${action}` as PermissionString);
            }
        }
    }

    return result;
}

/**
 * Reconstruct a PermissionMap from a flat list of permission strings.
 */
export function unflattenPermissions(permissionStrings: PermissionString[]): PermissionMap {
    const result = JSON.parse(JSON.stringify(EMPTY_PERMISSIONS)) as PermissionMap;

    for (const perm of permissionStrings) {
        const [module, action] = perm.split('.') as [PermissionModule, string];
        if (result[module] && action in result[module]) {
            (result[module] as Record<string, boolean>)[action] = true;
        }
    }

    return result;
}

/**
 * Merge two permission maps (union — if either grants, result grants).
 */
export function mergePermissions(a: PermissionMap, b: PermissionMap): PermissionMap {
    const result = JSON.parse(JSON.stringify(EMPTY_PERMISSIONS)) as PermissionMap;

    for (const module of Object.keys(result) as PermissionModule[]) {
        const aModule = (a[module] || {}) as Record<string, boolean>;
        const bModule = (b[module] || {}) as Record<string, boolean>;
        const rModule = result[module] as Record<string, boolean>;

        for (const action of Object.keys(rModule)) {
            rModule[action] = aModule[action] || bModule[action] || false;
        }
    }

    return result;
}

// ─── Module to Route Mapping ────────────────────────────────────
export const MODULE_ROUTE_MAP: Record<PermissionModule, string[]> = {
    orders: ['/dashboard/orders'],
    production: ['/dashboard/production'],
    inventory: ['/dashboard/inventory'],
    clients: ['/dashboard/clients'],
    finance: ['/dashboard/billing', '/dashboard/payments'],
    assistant: ['/dashboard/assistant'],
    team: ['/dashboard/team', '/dashboard/users'],
    settings: ['/dashboard/settings', '/dashboard/profile'],
    audit: ['/dashboard/audit-log'],
};

/**
 * Get the required module for a given route.
 */
export function getModuleForRoute(route: string): PermissionModule | null {
    for (const [module, routes] of Object.entries(MODULE_ROUTE_MAP)) {
        if (routes.some(r => route === r || route.startsWith(r + '/'))) {
            return module as PermissionModule;
        }
    }
    // Dashboard home is accessible to all authenticated users
    if (route === '/dashboard') return null;
    return null;
}

/**
 * Check if a user can access a route based on their permissions.
 */
export function canAccessRoute(
    permissions: PermissionMap | null | undefined,
    route: string,
    isAdmin: boolean = false
): boolean {
    if (isAdmin) return true;

    const module = getModuleForRoute(route);
    if (!module) return true; // No specific module required (e.g., dashboard home)

    return canView(permissions, module, isAdmin);
}
