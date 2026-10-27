"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// ─── Types ───────────────────────────────────────────────

export interface URLSyncConfig {
  /** Current page number */
  page: number;
  /** Current search query */
  search?: string;
  q?: string;
  /** Page size / limit */
  limit?: number;
  /** Sort field */
  sort?: string;
  /** Sort direction */
  order?: "asc" | "desc";
  /** Additional filter params to sync */
  filters?: Record<string, string | null | undefined>;
}

export interface UseURLSyncedPaginationOptions {
  /** Debounce delay for URL updates in ms. Default: 300 */
  debounceMs?: number;
}

export interface UseURLSyncedPaginationReturn {
  /** Read initial values from URL on mount */
  initialPage: number;
  initialSearch: string;
  initialLimit: number;
  initialSort: string;
  initialOrder: "asc" | "desc";
  initialFilters: Record<string, string>;
  /** Sync current state to URL (debounced) */
  syncToURL: (config: URLSyncConfig) => void;
}

// ─── Hook ────────────────────────────────────────────────

export function useURLSyncedPagination(
  options: UseURLSyncedPaginationOptions = {}
): UseURLSyncedPaginationReturn {
  const { debounceMs = 300 } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Read initial values from URL ──
  const initialPage = parseInt(searchParams.get("page") || "1", 10) || 1;
  const initialSearch = searchParams.get("q") || searchParams.get("search") || "";
  const initialLimit = parseInt(searchParams.get("limit") || "25", 10) || 25;
  const initialSort = searchParams.get("sort") || "";
  const initialOrder = (searchParams.get("order") as "asc" | "desc") || "desc";

  // Build initial filters from all non-standard pagination params
  const initialFilters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (!["page", "search", "q", "limit", "sort", "order"].includes(key)) {
      initialFilters[key] = value;
    }
  });

  // ── Debounced URL sync ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>("");

  const syncToURL = useCallback(
    (config: URLSyncConfig) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams();

        // Page (only if > 1)
        if (config.page > 1) {
          params.set("page", String(config.page));
        }

        // Limit (only if not default 25)
        if (config.limit && config.limit !== 25) {
          params.set("limit", String(config.limit));
        }

        // Search query q (only if non-empty)
        const rawSearch = config.q ?? config.search ?? "";
        const trimmedSearch = rawSearch.trim();
        if (trimmedSearch) {
          params.set("q", trimmedSearch);
        }

        // Sort
        if (config.sort) {
          params.set("sort", config.sort);
          if (config.order) {
            params.set("order", config.order);
          }
        }

        // Additional filters
        if (config.filters) {
          for (const [key, value] of Object.entries(config.filters)) {
            if (value !== undefined && value !== null && value !== "all" && value !== "") {
              params.set(key, value);
            }
          }
        }

        // Build query string
        const nextQuery = params.toString();

        // ── Equality check: prevent infinite loop ──
        if (nextQuery === lastQueryRef.current) {
          return;
        }
        lastQueryRef.current = nextQuery;

        const url = nextQuery ? `${pathname}?${nextQuery}` : pathname;
        router.replace(url, { scroll: false });
      }, debounceMs);
    },
    [pathname, router, debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    initialPage,
    initialSearch,
    initialLimit,
    initialSort,
    initialOrder,
    initialFilters,
    syncToURL,
  };
}
