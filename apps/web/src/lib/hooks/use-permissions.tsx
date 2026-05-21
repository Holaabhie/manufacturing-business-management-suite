"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import type { FlatPermissionMap } from "@/lib/permissions";
import {
    type RoleType,
    resolvePermissions,
    isOwnerRole,
    hasPermission,
    hasModuleAccess,
    canAccessRoute,
    ADMIN_PERMISSIONS,
    EMPTY_PERMISSIONS,
} from "@/lib/permissions";

// ─── Types ──────────────────────────────────────────────────────
export type UserRole = "Admin" | "Owner" | "Manager" | "Staff" | "Accountant";
export type SubscriptionTier = "starter" | "pro";
export type AccountStatus = "active" | "inactive" | "suspended" | "pending_setup";

export interface UserInfo {
    id: string;
    email: string;
    role: UserRole;
    subscription_tier: SubscriptionTier;
    full_name: string | null;
    phone_number: string | null;
    avatar_url: string | null;
    organizationId: string | null;
    employeeId: string | null;
    department: string | null;
    status: AccountStatus;
    permissions: FlatPermissionMap | null;
    customPermissions: FlatPermissionMap | null;
    resolvedPermissions: FlatPermissionMap | null;
    isActive: boolean;
    firstLoginCompleted: boolean;
}

interface PermissionContextValue {
    user: UserInfo | null;
    role: UserRole | null;
    tier: SubscriptionTier;
    loading: boolean;
    isAdmin: boolean;
    isOwner: boolean;
    isStaff: boolean;
    isPro: boolean;
    permissions: FlatPermissionMap;
    can: (permissionKey: string) => boolean;
    canViewModule: (moduleId: string) => boolean;
    canAccessRoute: (route: string) => boolean;
    refreshPermissions: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────
const PermissionContext = createContext<PermissionContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────
export function PermissionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me");
            const json = await res.json().catch(() => ({}));
            if (json?.user) {
                setUser(json.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
        const interval = setInterval(fetchUser, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchUser]);

    const role = user?.role ?? null;
    const tier = user?.subscription_tier ?? "starter";
    const isOwner = isOwnerRole(role);
    const isAdmin = isOwner; // backward compat
    const isStaff = role === "Staff";
    const isPro = tier === "pro";

    // Resolve permissions: use resolvedPermissions from API if available,
    // otherwise compute locally
    const permissions: FlatPermissionMap = isOwner
        ? ADMIN_PERMISSIONS
        : user?.resolvedPermissions ?? resolvePermissions(role, user?.customPermissions);

    const can = useCallback(
        (permissionKey: string) =>
            hasPermission(permissions, permissionKey, isOwner),
        [permissions, isOwner]
    );

    const canViewModule = useCallback(
        (moduleId: string) => hasModuleAccess(permissions, moduleId, isOwner),
        [permissions, isOwner]
    );

    const canAccessRouteFn = useCallback(
        (route: string) => canAccessRoute(permissions, route, isOwner),
        [permissions, isOwner]
    );

    const value: PermissionContextValue = {
        user,
        role,
        tier,
        loading,
        isAdmin,
        isOwner,
        isStaff,
        isPro,
        permissions,
        can,
        canViewModule,
        canAccessRoute: canAccessRouteFn,
        refreshPermissions: fetchUser,
    };

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

// ─── Hook ───────────────────────────────────────────────────────
export function usePermissions(): PermissionContextValue {
    const context = useContext(PermissionContext);

    if (!context) {
        return useFallbackPermissions();
    }

    return context;
}

function useFallbackPermissions(): PermissionContextValue {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me");
            const json = await res.json().catch(() => ({}));
            if (json?.user) {
                setUser(json.user);
            }
        } catch {
            // Ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const role = user?.role ?? null;
    const isOwner = isOwnerRole(role);
    const permissions: FlatPermissionMap = isOwner
        ? ADMIN_PERMISSIONS
        : user?.resolvedPermissions ?? resolvePermissions(role, user?.customPermissions);

    return {
        user,
        role,
        tier: user?.subscription_tier ?? "starter",
        loading,
        isAdmin: isOwner,
        isOwner,
        isStaff: role === "Staff",
        isPro: user?.subscription_tier === "pro",
        permissions,
        can: (permissionKey: string) =>
            hasPermission(permissions, permissionKey, isOwner),
        canViewModule: (moduleId: string) =>
            hasModuleAccess(permissions, moduleId, isOwner),
        canAccessRoute: (route: string) =>
            canAccessRoute(permissions, route, isOwner),
        refreshPermissions: fetchUser,
    };
}

/**
 * @deprecated Use usePermissions() instead
 */
export function useRole() {
    const { role, tier, isAdmin, isOwner, isStaff, isPro, loading } = usePermissions();
    return { role, tier, isAdmin, isOwner, isStaff, isPro, loading };
}
