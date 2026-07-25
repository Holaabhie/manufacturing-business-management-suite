/**
 * useCachedPage.ts
 * ────────────────
 * Reusable hook for mobile-app-style screen persistence.
 *
 * Usage:
 *   const { restoreState, persist, containerRef, onScroll, restoreScroll } = useCachedPage({
 *     pageKey: "orders",
 *   });
 *
 *   // On mount — restore cached UI state
 *   useEffect(() => {
 *     const cached = restoreState();
 *     if (cached) {
 *       setSearchQuery(cached.searchQuery as string);
 *       // ...
 *     }
 *   }, []);
 *
 *   // On unmount — persist current state
 *   useEffect(() => {
 *     return () => {
 *       persist({ searchQuery, currentPage, statusFilter, scrollY: scrollYRef.current });
 *     };
 *   }, [searchQuery, currentPage, statusFilter]);
 */

import { useEffect, useRef, useCallback } from "react";
import usePageStateCache from "@/infrastructure/state/pageStateCache";

interface CachedPageOptions {
  /** Unique key for this page, e.g. "orders", "clients", "inventory" */
  pageKey: string;
  /** Optional max age in ms — if cache is older, it's considered stale and cleared */
  maxAgeMs?: number;
}

export function useCachedPage({ pageKey, maxAgeMs }: CachedPageOptions) {
  const { saveState, getState, clearState } = usePageStateCache();
  const scrollYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Restore cached state for this page.
   * Returns the cached object or null if no cache / cache expired.
   */
  const restoreState = useCallback(() => {
    const cached = getState(pageKey);
    if (!cached) return null;

    // Check age if maxAgeMs is set
    if (maxAgeMs && typeof cached._cachedAt === "number") {
      if (Date.now() - cached._cachedAt > maxAgeMs) {
        clearState(pageKey);
        return null;
      }
    }

    return cached;
  }, [pageKey, maxAgeMs, getState, clearState]);

  /**
   * Persist a state snapshot for this page.
   * Merges with existing cache (so you can call persist with partial state).
   */
  const persist = useCallback(
    (stateSnapshot: Record<string, unknown>) => {
      saveState(pageKey, { ...stateSnapshot, _cachedAt: Date.now() });
    },
    [pageKey, saveState],
  );

  /**
   * Scroll event handler — attach to a scrollable container.
   * Tracks scroll position into scrollYRef for persistence on unmount.
   */
  const onScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    scrollYRef.current = target.scrollTop;
  }, []);

  /**
   * Restore scroll position after data renders.
   * Call this after your data has been applied to state.
   */
  const restoreScroll = useCallback((scrollY: number) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
        } else {
          window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
        }
      });
    });
  }, []);

  // Attach scroll listener to container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return {
    restoreState,
    persist,
    scrollYRef,
    containerRef,
    onScroll,
    restoreScroll,
    clearPageState: () => clearState(pageKey),
  };
}
