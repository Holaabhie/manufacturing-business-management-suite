"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────

export interface UsePaginatedSearchOptions<T> {
  /** The full data array to paginate and search */
  data: T[];
  /**
   * Fields to search across. Supports dot-path notation for nested fields
   * e.g. ["name", "client.name", "id"]
   */
  searchFields: string[];
  /** Items per page. Default: 15. Fixed — not dynamically changeable. */
  pageSize?: number;
  /** Initial page number. Default: 1 */
  initialPage?: number;
  /** Initial search query. Default: "" */
  initialSearch?: string;
  /** Optional custom filter function. Overrides default field-based search. */
  filterFn?: (item: T, normalizedQuery: string) => boolean;
}

export interface UsePaginatedSearchReturn<T> {
  /** Raw search input value (updates immediately) */
  searchQuery: string;
  /** Debounced search value (updates after 300ms) */
  debouncedQuery: string;
  /** Handler for search input changes — call this from onChange */
  handleSearch: (val: string) => void;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Set current page */
  setCurrentPage: (page: number) => void;
  /** Total number of pages */
  totalPages: number;
  /** Number of items after filtering (before pagination) */
  totalFiltered: number;
  /** Total number of items in the original data */
  totalItems: number;
  /** The current page's data slice */
  paginatedData: T[];
  /** Whether a search is actively debouncing */
  isSearching: boolean;
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Safely access a nested field via dot-path.
 * e.g. getNestedValue(obj, "client.name") → obj.client?.name
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Normalize search query: collapse whitespace and trim.
 */
function normalizeQuery(q: string): string {
  return q.replace(/\s+/g, " ").trim().toLowerCase();
}

// ─── Hook ────────────────────────────────────────────────

export function usePaginatedSearch<T>(
  options: UsePaginatedSearchOptions<T>
): UsePaginatedSearchReturn<T> {
  const {
    data,
    searchFields,
    pageSize = 15,
    initialPage = 1,
    initialSearch = "",
    filterFn,
  } = options;

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isSearching, setIsSearching] = useState(false);

  // ── Debounce using useRef (NOT cleanup-return pattern) ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    setIsSearching(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val);
      setIsSearching(false);
    }, 300);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ── Stable references for searchFields to avoid useMemo re-runs ──
  const searchFieldsRef = useRef(searchFields);
  searchFieldsRef.current = searchFields;

  // ── Filtered data (by debounced search) ──
  const filteredData = useMemo(() => {
    const normalized = normalizeQuery(debouncedQuery);
    if (!normalized) return data;

    return data.filter((item) => {
      if (filterFn) {
        return filterFn(item, normalized);
      }

      // Default: check if any of the search fields contain the query
      return searchFieldsRef.current.some((field) => {
        const value = getNestedValue(item, field);
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(normalized);
      });
    });
  }, [data, debouncedQuery, filterFn]);

  // ── Derived counts ──
  const totalItems = data.length;
  const totalFiltered = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  // ── Page validity guard ──
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // ── Paginated slice ──
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return {
    searchQuery,
    debouncedQuery,
    handleSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    totalFiltered,
    totalItems,
    paginatedData,
    isSearching,
  };
}
