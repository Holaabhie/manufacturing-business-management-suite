"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Module Configuration ──────────────────────────────────────────
export interface ModuleConfig {
  production: boolean;
  machines: boolean;
  inventory: boolean;
  orders: boolean;
  billing: boolean;
  payments: boolean;
  clients: boolean;
  // Always-on modules
  dashboard: boolean;
  ai_assistant: boolean;
  staff_roles: boolean;
}

export const DEFAULT_MODULES: ModuleConfig = {
  production: true,
  machines: true,
  inventory: true,
  orders: true,
  billing: false,
  payments: false,
  clients: false,
  // Always true, not toggleable
  dashboard: true,
  ai_assistant: true,
  staff_roles: true,
};

export const LOCKED_MODULES: (keyof ModuleConfig)[] = [
  "dashboard",
  "ai_assistant",
  "staff_roles",
];

export const MODULE_META: Record<
  keyof ModuleConfig,
  { label: string; description: string; icon: string; color: string }
> = {
  production: {
    label: "Production Management",
    description: "Manage production workflows, jobs, and tracking",
    icon: "Cog",
    color: "#FF9500",
  },
  machines: {
    label: "Machines",
    description: "Track machines, maintenance, and capacity",
    icon: "Cpu",
    color: "#8E8E93",
  },
  inventory: {
    label: "Inventory & Materials",
    description: "Track raw materials, stock levels, and purchasing",
    icon: "Package",
    color: "#34C759",
  },
  orders: {
    label: "Orders Management",
    description: "Handle customer orders, fulfillment, and status tracking",
    icon: "ShoppingCart",
    color: "#007AFF",
  },
  billing: {
    label: "Billing & Invoices",
    description: "Create invoices, manage GST billing, and export to Tally",
    icon: "FileText",
    color: "#5856D6",
  },
  payments: {
    label: "Payments Tracking",
    description: "Track incoming and outgoing payments and dues",
    icon: "CreditCard",
    color: "#FF2D55",
  },
  clients: {
    label: "Clients Management",
    description: "Manage client profiles, contacts, and relationships",
    icon: "Users",
    color: "#AF52DE",
  },
  dashboard: {
    label: "Dashboard & Analytics",
    description: "Overview metrics, charts, and business intelligence",
    icon: "LayoutDashboard",
    color: "#007AFF",
  },
  ai_assistant: {
    label: "AI Assistant",
    description: "Smart AI-powered business insights and assistance",
    icon: "Bot",
    color: "#FF9500",
  },
  staff_roles: {
    label: "Staff & Roles",
    description: "User management, role assignment, and team access",
    icon: "UserCog",
    color: "#5AC8FA",
  },
};

// ─── User-specific storage key ─────────────────────────────────────
const STORAGE_KEY_PREFIX = "ind_modules_";
const LEGACY_STORAGE_KEY = "ind_modules";

function getStorageKey(userId: string | null): string {
  if (!userId) return LEGACY_STORAGE_KEY;
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * useModules — single source of truth for module enable/disable state.
 * Persists to localStorage (user-specific) and optionally syncs to API.
 *
 * Module state is keyed by user ID so different users on the same browser
 * each get their own independent module selections.
 */
export function useModules() {
  // Fetch logged-in user ID for user-specific storage
  const [userId, setUserId] = useState<string | null>(null);
  const userIdLoadedRef = useRef(false);

  useEffect(() => {
    // Fetch user ID from auth session
    const fetchUserId = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        const id = data?.user?.id || data?.user?.email || null;
        setUserId(id);
        userIdLoadedRef.current = true;
      } catch {
        userIdLoadedRef.current = true;
        // If auth fails, fall back to legacy key
      }
    };
    fetchUserId();
  }, []);

  const [modules, setModules] = useState<ModuleConfig>(() => {
    // SSR safety
    if (typeof window === "undefined") return DEFAULT_MODULES;
    try {
      // On initial load, try legacy key first (will be migrated once userId loads)
      const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure locked modules are always true + machines key exists
        return {
          ...DEFAULT_MODULES,
          ...parsed,
          dashboard: true,
          ai_assistant: true,
          staff_roles: true,
        };
      }
    } catch {
      // Corrupted localStorage — use defaults
    }
    return DEFAULT_MODULES;
  });

  // Re-load modules when userId becomes available (user-specific key)
  useEffect(() => {
    if (!userId) return;

    const userKey = getStorageKey(userId);

    try {
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setModules({
          ...DEFAULT_MODULES,
          ...parsed,
          dashboard: true,
          ai_assistant: true,
          staff_roles: true,
        });
      } else {
        // Migrate from legacy key if user-specific key doesn't exist yet
        const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacySaved) {
          const parsed = JSON.parse(legacySaved);
          const migrated = {
            ...DEFAULT_MODULES,
            ...parsed,
            dashboard: true,
            ai_assistant: true,
            staff_roles: true,
          };
          setModules(migrated);
          // Save under user-specific key
          localStorage.setItem(userKey, JSON.stringify(migrated));
        } else {
          setModules(DEFAULT_MODULES);
        }
      }
    } catch {
      setModules(DEFAULT_MODULES);
    }

    // Also try loading from DB (authoritative source)
    fetch("/api/user/modules")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.modules) {
          const fromDb = {
            ...DEFAULT_MODULES,
            ...data.modules,
            dashboard: true,
            ai_assistant: true,
            staff_roles: true,
          };
          setModules(fromDb);
          localStorage.setItem(userKey, JSON.stringify(fromDb));
        }
      })
      .catch(() => {
        // Fail silently — localStorage is fallback
      });
  }, [userId]);

  // Re-sync from localStorage on storage events (cross-tab sync)
  useEffect(() => {
    const currentKey = getStorageKey(userId);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === currentKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setModules({
            ...DEFAULT_MODULES,
            ...parsed,
            dashboard: true,
            ai_assistant: true,
            staff_roles: true,
          });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [userId]);

  const persistModules = useCallback(
    (updated: ModuleConfig) => {
      setModules(updated);
      const key = getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(updated));
      // Fire a custom event so other components on same tab re-read
      window.dispatchEvent(new Event("ind-modules-changed"));
      // Sync to DB per user
      fetch("/api/user/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(() => {
        // Fail silently if no API yet
      });
    },
    [userId]
  );

  // Listen for same-tab changes
  useEffect(() => {
    const handler = () => {
      try {
        const key = getStorageKey(userId);
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          setModules({
            ...DEFAULT_MODULES,
            ...parsed,
            dashboard: true,
            ai_assistant: true,
            staff_roles: true,
          });
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("ind-modules-changed", handler);
    return () => window.removeEventListener("ind-modules-changed", handler);
  }, [userId]);

  const updateModule = useCallback(
    (key: keyof ModuleConfig, value: boolean) => {
      if (LOCKED_MODULES.includes(key)) return; // can't toggle locked ones
      const updated = { ...modules, [key]: value };
      persistModules(updated);
    },
    [modules, persistModules]
  );

  const updateAllModules = useCallback(
    (newModules: Partial<ModuleConfig>) => {
      const merged: ModuleConfig = {
        ...DEFAULT_MODULES,
        ...newModules,
        // Force locked
        dashboard: true,
        ai_assistant: true,
        staff_roles: true,
      };
      persistModules(merged);
    },
    [persistModules]
  );

  return {
    modules,
    updateModule,
    updateAllModules,
    LOCKED_MODULES,
    MODULE_META,
  };
}
