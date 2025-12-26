import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type UserRole = "Admin" | "Staff";
export type SubscriptionTier = "starter" | "pro";

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>("starter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, subscription_tier")
          .eq("id", user.id)
          .single();
        
        setRole((profile?.role as UserRole) || "Staff");
        setTier((profile?.subscription_tier as SubscriptionTier) || "starter");
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
