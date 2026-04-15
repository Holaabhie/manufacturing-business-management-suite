"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import type { PermissionMap, PermissionModule } from "@/lib/permissions";
import { ADMIN_PERMISSIONS, EMPTY_PERMISSIONS, hasPermission, hasModuleAccess, canAccessRoute } from "@/lib/permissions";

// ─── Types ──────────────────────────────────────────────────────
export type UserRole = "Admin" | "Staff";
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
    permissions: PermissionMap | null;
    firstLoginCompleted: boolean;
}

interface PermissionContextValue {
    user: UserInfo | null;
    role: UserRole | null;
    tier: SubscriptionTier;
    loading: boolean;
    isAdmin: boolean;
    isStaff: boolean;
    isPro: boolean;
    permissions: PermissionMap;
    can: (module: PermissionModule, action: string) => boolean;
    canViewModule: (module: PermissionModule) => boolean;
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
    const isAdmin = role === "Admin";
    const isStaff = role === "Staff";
    const isPro = tier === "pro";

    const permissions: PermissionMap = isAdmin
        ? ADMIN_PERMISSIONS
        : user?.permissions ?? EMPTY_PERMISSIONS;

    const can = useCallback(
        (module: PermissionModule, action: string) =>
            hasPermission(permissions, module, action, isAdmin),
        [permissions, isAdmin]
    );

    const canViewModule = useCallback(
        (module: PermissionModule) => hasModuleAccess(permissions, module, isAdmin),
        [permissions, isAdmin]
    );

    const canAccessRouteFn = useCallback(
        (route: string) => canAccessRoute(permissions, route, isAdmin),
        [permissions, isAdmin]
    );

    const value: PermissionContextValue = {
        user,
        role,
        tier,
        loading,
        isAdmin,
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
    const isAdmin = role === "Admin";
    const permissions: PermissionMap = isAdmin
        ? ADMIN_PERMISSIONS
        : user?.permissions ?? EMPTY_PERMISSIONS;

    return {
        user,
        role,
        tier: user?.subscription_tier ?? "starter",
        loading,
        isAdmin,
        isStaff: role === "Staff",
        isPro: user?.subscription_tier === "pro",
        permissions,
        can: (module: PermissionModule, action: string) =>
            hasPermission(permissions, module, action, isAdmin),
        canViewModule: (module: PermissionModule) =>
            hasModuleAccess(permissions, module, isAdmin),
        canAccessRoute: (route: string) =>
            canAccessRoute(permissions, route, isAdmin),
        refreshPermissions: fetchUser,
    };
}

/**
 * @deprecated Use usePermissions() instead
 */
export function useRole() {
    const { role, tier, isAdmin, isStaff, isPro, loading } = usePermissions();
    return { role, tier, isAdmin, isStaff, isPro, loading };
}
