import { useState, useEffect } from "react";

export type UserRole = "Admin" | "Staff";
export type SubscriptionTier = "starter" | "pro";

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>("starter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const res = await fetch("/api/auth/me");
      const json = await res.json().catch(() => ({}));
      if (json?.user) {
        setRole((json.user.role as UserRole) || "Staff");
        setTier((json.user.subscription_tier as SubscriptionTier) || "starter");
      }
      setLoading(false);
    }

    fetchRole();
  }, []);

  const isAdmin = role === "Admin";
  const isStaff = role === "Staff";
  const isPro = tier === "pro";

  return { role, tier, isAdmin, isStaff, isPro, loading };
}
