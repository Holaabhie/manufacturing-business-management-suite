"use client";

/**
 * Feature Context — React Provider for Feature Flags
 * 
 * Fetches feature flags from /api/features and provides them to all
 * FeatureGate components via React Context.
 * 
 * Features:
 * - Fetches on mount and caches in state
 * - Refreshes every 5 minutes
 * - Refreshes on window focus (catch admin changes)
 * - Provides checkAccess() for any component via useFeatureFlags()
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  checkFeatureAccess,
  type FeatureFlagData,
  type FeatureCheckResult,
} from './feature-gate';
import { isDevMode } from './dev-mode';
import type { FeatureKey } from './feature-flags';

// ─── Types ──────────────────────────────────────────────────────

interface FeatureContextValue {
  /** All feature flags loaded from server */
  flags: FeatureFlagData[];
  /** Whether flags are still loading */
  isLoading: boolean;
  /** Error if flags failed to load */
  error: string | null;
  /** Check access for a specific feature */
  checkAccess: (featureKey: FeatureKey | string) => FeatureCheckResult;
  /** Force refresh flags from server */
  refreshFlags: () => Promise<void>;
  /** Whether dev mode is active */
  devMode: boolean;
}

// ─── Context ────────────────────────────────────────────────────

const FeatureContext = createContext<FeatureContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────

interface FeatureProviderProps {
  children: ReactNode;
  /** User role from auth context */
  userRole: 'Admin' | 'Staff' | null;
  /** User subscription tier from auth context */
  userTier: 'starter' | 'pro';
}

export function FeatureProvider({
  children,
  userRole,
  userTier,
}: FeatureProviderProps) {
  const [flags, setFlags] = useState<FeatureFlagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const devMode = isDevMode();

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch('/api/features');
      if (!res.ok) {
        throw new Error(`Failed to fetch features: ${res.status}`);
      }
      const data = await res.json();
      setFlags(data.features || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
      setError(err instanceof Error ? err.message : 'Failed to load features');
      // Don't clear existing flags on error (stale is better than nothing)
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchFlags, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFlags]);

  // Refresh on window focus (catch admin changes quickly)
  useEffect(() => {
    const handleFocus = () => {
      fetchFlags();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchFlags]);

  const checkAccess = useCallback(
    (featureKey: FeatureKey | string): FeatureCheckResult => {
      return checkFeatureAccess(featureKey, userRole, userTier, flags);
    },
    [userRole, userTier, flags]
  );

  const value: FeatureContextValue = {
    flags,
    isLoading,
    error,
    checkAccess,
    refreshFlags: fetchFlags,
    devMode,
  };

  return (
    <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────

/**
 * Access the feature flag context.
 * Must be used within a <FeatureProvider>.
 */
export function useFeatureFlags(): FeatureContextValue {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error(
      'useFeatureFlags must be used within a <FeatureProvider>. ' +
      'Wrap your layout with <FeatureProvider>.'
    );
  }
  return context;
}
