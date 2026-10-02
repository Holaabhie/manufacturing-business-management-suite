"use client";

import { useState, useEffect } from "react";

export function useTenantCreationDate(fallbackDate?: Date) {
  const [earliestDate, setEarliestDate] = useState<Date>(fallbackDate || new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCreationDate() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        const dateStr = data?.user?.tenantCreatedAt || data?.user?.createdAt;
        if (dateStr && !cancelled) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            setEarliestDate(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tenant creation date:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCreationDate();

    return () => {
      cancelled = true;
    };
  }, []);

  return { earliestDate, loading };
}
