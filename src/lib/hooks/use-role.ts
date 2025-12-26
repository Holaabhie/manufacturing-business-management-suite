import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type UserRole = "Admin" | "Staff";

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        setRole((profile?.role as UserRole) || "Staff");
      }
      setLoading(false);
    }

    fetchRole();
  }, []);

  const isAdmin = role === "Admin";
  const isStaff = role === "Staff";

  return { role, isAdmin, isStaff, loading };
}
