import { useState, useEffect, useCallback } from "react";
import {
  resolvePermissions,
  hasPermission,
  type FlatPermissionMap,
} from "@/lib/permissions";

export type UserRole = "Admin" | "Owner" | "Manager" | "Staff" | "Accountant";
export type SubscriptionTier = "starter" | "pro";

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>("starter");
  const [permissions, setPermissions] = useState<FlatPermissionMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const res = await fetch("/api/auth/me");
      const json = await res.json().catch(() => ({}));
      if (json?.user) {
        const userRole = (json.user.role as UserRole) || "Staff";
        setRole(userRole);
        setTier((json.user.subscription_tier as SubscriptionTier) || "starter");
        setPermissions(
          json.user.resolvedPermissions ||
            resolvePermissions(userRole, json.user.customPermissions)
        );
      }
      setLoading(false);
    }

    fetchRole();
  }, []);

  const isAdmin = role === "Admin" || role === "Owner";
  const isStaff = role === "Staff";
  const isPro = tier === "pro";

  const can = useCallback(
    (permissionKey: string): boolean => {
      return hasPermission(permissions, permissionKey, isAdmin);
    },
    [permissions, isAdmin]
  );

  return { role, tier, isAdmin, isStaff, isPro, permissions, can, loading };
}
