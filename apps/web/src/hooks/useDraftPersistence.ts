"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";

export const DRAFT_STORAGE_PREFIX = "draft:";
export const AUTH_SCOPE_STORAGE_KEY = "ind:auth:scope";
export const DEFAULT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface DraftEnvelope<T> {
  data: T;
  savedAt: number; // Unix timestamp in ms
  version: number;
}

export interface DraftPersistenceOptions {
  /** Maximum age in milliseconds before a draft is considered stale (default: 24h) */
  ttlMs?: number;
  /** Debounce interval in ms for writes to localStorage (default: 300ms) */
  debounceMs?: number;
}

/**
 * Resolves a safe tenant/user scope for namespacing localStorage draft keys.
 * Checks:
 * 1. user.organizationId
 * 2. user.adminId (for staff members)
 * 3. user.id
 * 4. Cached fallback in localStorage ("ind:auth:scope")
 * 5. Default "global"
 */
function resolveScope(user: any): string {
  if (user) {
    const scope = user.organizationId || user.adminId || user.id;
    if (scope && typeof window !== "undefined") {
      try {
        localStorage.setItem(AUTH_SCOPE_STORAGE_KEY, scope);
      } catch {
        // Ignore quota/security errors
      }
      return scope;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(AUTH_SCOPE_STORAGE_KEY);
      if (cached) return cached;
    } catch {
      // Ignore
    }
  }

  return "global";
}

/**
 * Builds a namespaced storage key:
 * Raw key: "draft:production-setup:new"
 * Storage key: "draft:<scopeId>:production-setup:new"
 */
export function buildStorageKey(rawKey: string, scopeId: string): string {
  const cleanKey = rawKey.startsWith(DRAFT_STORAGE_PREFIX)
    ? rawKey.slice(DRAFT_STORAGE_PREFIX.length)
    : rawKey;
  return `${DRAFT_STORAGE_PREFIX}${scopeId}:${cleanKey}`;
}

/**
 * Helper to purge all drafts from localStorage on logout or session change.
 * If scopeId is provided, purges only drafts for that scope.
 * Otherwise purges all keys starting with "draft:".
 * Also removes the cached auth scope fallback.
 */
export function clearAllDrafts(scopeId?: string): void {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    const prefix = scopeId ? `${DRAFT_STORAGE_PREFIX}${scopeId}:` : DRAFT_STORAGE_PREFIX;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(AUTH_SCOPE_STORAGE_KEY);
  } catch (err) {
    console.error("[useDraftPersistence] Failed to clear drafts:", err);
  }
}

/**
 * NOTE: Multi-tab same-draft collision (accepted limitation):
 * If a user opens two simultaneous browser tabs both creating a new production run,
 * both tabs share the same draft key ('draft:<scope>:production-setup:new') and
 * can overwrite each other's debounced writes. Cross-tab synchronization / locks
 * are intentionally out of scope for this pass.
 */

export interface UseDraftPersistenceReturn<T> {
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  updateDraft: (patch: Partial<T> | ((prev: T) => Partial<T>)) => void;
  clearDraft: () => void;
  isRestored: boolean;
  savedAt: number | null;
}

export type DraftTuple<T> = [
  T,
  React.Dispatch<React.SetStateAction<T>>,
  () => void,
  boolean
] & UseDraftPersistenceReturn<T>;

export function useDraftPersistence<T extends Record<string, any>>(
  rawKey: string,
  initialState: T,
  options: DraftPersistenceOptions = {}
): DraftTuple<T> {
  const { ttlMs = DEFAULT_DRAFT_TTL_MS, debounceMs = 300 } = options;
  const { user } = usePermissions();

  const currentScope = resolveScope(user);
  const storageKey = buildStorageKey(rawKey, currentScope);

  const [draft, setDraftState] = useState<T>(() => {
    if (typeof window === "undefined") return initialState;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initialState;

      const parsed: DraftEnvelope<T> = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.data) {
        localStorage.removeItem(storageKey);
        return initialState;
      }

      // Check draft staleness (TTL)
      if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt > ttlMs) {
        console.warn(`[useDraftPersistence] Discarding stale draft (${parsed.savedAt}) for ${storageKey}`);
        localStorage.removeItem(storageKey);
        return initialState;
      }

      return { ...initialState, ...parsed.data };
    } catch (err) {
      console.error(`[useDraftPersistence] Failed to restore draft for ${storageKey}:`, err);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }
      return initialState;
    }
  });

  const [isRestored, setIsRestored] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed: DraftEnvelope<T> = JSON.parse(raw);
      if (parsed?.savedAt && Date.now() - parsed.savedAt <= ttlMs) {
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  });

  const [savedAt, setSavedAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed: DraftEnvelope<T> = JSON.parse(raw);
      return parsed?.savedAt || null;
    } catch {
      return null;
    }
  });

  // Keep a ref to the latest draft and pending timer to ensure flush on unmount/beforeunload
  const draftRef = useRef<T>(draft);
  draftRef.current = draft;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef<boolean>(false);
  const isClearedRef = useRef<boolean>(false);

  // Write immediate flush helper
  const flush = useCallback(() => {
    if (typeof window === "undefined" || isClearedRef.current || !isDirtyRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      const now = Date.now();
      const envelope: DraftEnvelope<T> = {
        data: draftRef.current,
        savedAt: now,
        version: 1,
      };
      localStorage.setItem(storageKey, JSON.stringify(envelope));
      setSavedAt(now);
      isDirtyRef.current = false;
    } catch (err) {
      console.error(`[useDraftPersistence] Flush write failed for ${storageKey}:`, err);
    }
  }, [storageKey]);

  // Schedule a debounced write to localStorage
  const scheduleWrite = useCallback(
    (nextDraft: T) => {
      if (typeof window === "undefined" || isClearedRef.current) return;

      isDirtyRef.current = true;
      draftRef.current = nextDraft;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        try {
          const now = Date.now();
          const envelope: DraftEnvelope<T> = {
            data: nextDraft,
            savedAt: now,
            version: 1,
          };
          localStorage.setItem(storageKey, JSON.stringify(envelope));
          setSavedAt(now);
          isDirtyRef.current = false;
        } catch (err) {
          console.error(`[useDraftPersistence] Debounce write failed for ${storageKey}:`, err);
        }
      }, debounceMs);
    },
    [storageKey, debounceMs]
  );

  // Custom setDraft that updates state and schedules a debounced write
  const setDraft = useCallback(
    (action: React.SetStateAction<T>) => {
      isClearedRef.current = false;
      setDraftState((prev) => {
        const next = typeof action === "function" ? (action as (prevState: T) => T)(prev) : action;
        scheduleWrite(next);
        return next;
      });
    },
    [scheduleWrite]
  );

  // Helper for partial updates
  const updateDraft = useCallback(
    (patch: Partial<T> | ((prev: T) => Partial<T>)) => {
      setDraft((prev) => {
        const patchObj = typeof patch === "function" ? patch(prev) : patch;
        return { ...prev, ...patchObj };
      });
    },
    [setDraft]
  );

  // Explicitly clear draft (on successful submit or cancel/discard)
  const clearDraft = useCallback(() => {
    isClearedRef.current = true;
    isDirtyRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.error(`[useDraftPersistence] Failed to remove ${storageKey}:`, err);
      }
    }
    setSavedAt(null);
    setIsRestored(false);
  }, [storageKey]);

  // Flush any pending write on unmount (route change)
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  // Flush on beforeunload (browser tab close or reload) and visibilitychange (backgrounding tab)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      flush();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flush]);

  // If user/scope changes dynamically (e.g. auth resolves after initial frame), recheck/migrate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolvedScope = resolveScope(user);
    const updatedKey = buildStorageKey(rawKey, resolvedScope);

    if (updatedKey !== storageKey) {
      try {
        const raw = localStorage.getItem(updatedKey);
        if (raw) {
          const parsed: DraftEnvelope<T> = JSON.parse(raw);
          if (parsed?.savedAt && Date.now() - parsed.savedAt <= ttlMs) {
            setDraftState(parsed.data);
            setIsRestored(true);
            setSavedAt(parsed.savedAt);
          }
        }
      } catch {
        // Ignore
      }
    }
  }, [user, rawKey, storageKey, ttlMs]);

  // Construct return value supporting both tuple and object destructuring
  const result = [draft, setDraft, clearDraft, isRestored] as DraftTuple<T>;
  result.draft = draft;
  result.setDraft = setDraft;
  result.updateDraft = updateDraft;
  result.clearDraft = clearDraft;
  result.isRestored = isRestored;
  result.savedAt = savedAt;

  return result;
}
