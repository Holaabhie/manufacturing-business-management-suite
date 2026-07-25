"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// ─── Types ───────────────────────────────────────────────

export interface URLSyncConfig {
  /** Current page number */
  page: number;
  /** Current search query */
  search: string;
  /** Additional filter params to sync */
  filters?: Record<string, string | null>;
}

export interface UseURLSyncedPaginationOptions {
  /** Debounce delay for URL updates in ms. Default: 750 */
  debounceMs?: number;
}

export interface UseURLSyncedPaginationReturn {
  /** Read initial values from URL on mount */
  initialPage: number;
  initialSearch: string;
  initialFilters: Record<string, string>;
  /** Sync current state to URL (debounced) */
  syncToURL: (config: URLSyncConfig) => void;
}

// ─── Hook ────────────────────────────────────────────────

export function useURLSyncedPagination(
  options: UseURLSyncedPaginationOptions = {}
): UseURLSyncedPaginationReturn {
  const { debounceMs = 750 } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Read initial values from URL ──
  const initialPage = parseInt(searchParams.get("page") || "1", 10) || 1;
  const initialSearch = searchParams.get("search") || "";

  // Build initial filters from all non-page, non-search params
  const initialFilters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "page" && key !== "search") {
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

        // Search (only if non-empty)
        const trimmedSearch = config.search.trim();
        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        }

        // Additional filters
        if (config.filters) {
          for (const [key, value] of Object.entries(config.filters)) {
            if (value && value !== "all") {
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
    initialFilters,
    syncToURL,
  };
}
