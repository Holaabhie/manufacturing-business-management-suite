/**
 * pageStateCache.ts
 * ─────────────────
 * Zustand store for in-memory page state caching.
 * Persists UI state (search, filters, pagination, scroll, fetched data)
 * across client-side navigations within a session.
 *
 * Cleared on:
 *   - Logout (explicit clearAll())
 *   - Hard refresh / tab close (in-memory, auto-cleared)
 */

import { create } from "zustand";

interface PageStateCacheStore {
  cache: Record<string, Record<string, unknown>>;

  /** Merge partial state into a page's cache entry */
  saveState: (pageKey: string, state: Record<string, unknown>) => void;

  /** Get cached state for a page, or null if none */
  getState: (pageKey: string) => Record<string, unknown> | null;

  /** Clear a single page's cached state */
  clearState: (pageKey: string) => void;

  /** Clear ALL cached state (used on logout) */
  clearAll: () => void;
}

const usePageStateCache = create<PageStateCacheStore>((set, get) => ({
  cache: {},

  saveState: (pageKey, state) =>
    set((prev) => ({
      cache: {
        ...prev.cache,
        [pageKey]: { ...prev.cache[pageKey], ...state },
      },
    })),

  getState: (pageKey) => get().cache[pageKey] ?? null,

  clearState: (pageKey) =>
    set((prev) => {
      const next = { ...prev.cache };
      delete next[pageKey];
      return { cache: next };
    }),

  clearAll: () => set({ cache: {} }),
}));

export default usePageStateCache;
