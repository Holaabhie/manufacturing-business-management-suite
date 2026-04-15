/**
 * Feature Gate Engine — Core Access Check Logic
 * 
 * This is the MOST CRITICAL file in the feature gating system.
 * 
 * Decision tree:
 * 1. DEV_MODE=true → Allow everything (log warning)
 * 2. User is Admin → Allow everything (admin override)
 * 3. Feature globally disabled → Block (except Admin)
 * 4. Feature is adminOnly → Block non-Admin users
 * 5. User's subscription_tier is in feature's allowedTiers → Allow
 * 6. Otherwise → Block, show upgrade prompt
 * 
 * The engine uses an in-memory cache with TTL to avoid DB hits on every check.
 * Server-side: fetches directly from MongoDB
 * Client-side: relies on FeatureContext (fetches from /api/features)
 */

import type { FeatureKey } from './feature-flags';
import { allowAllFeatures } from './dev-mode';

// ─── Types ──────────────────────────────────────────────────────

export type UserRole = 'Admin' | 'Staff';
export type SubscriptionTier = 'starter' | 'pro';

/** Represents a feature flag from the database */
export interface FeatureFlagData {
  key: string;
  name: string;
  description?: string;
  allowedTiers: SubscriptionTier[];
  adminOnly: boolean;
  enabled: boolean;
}

/** Reason why access was granted or denied */
export type FeatureAccessReason =
  | 'dev_mode'
  | 'admin_override'
  | 'tier_allowed'
  | 'feature_disabled'
  | 'admin_only'
  | 'tier_insufficient'
  | 'not_authenticated'
  | 'feature_not_found';

/** Result of a feature access check */
export interface FeatureCheckResult {
  /** Whether access is granted */
  allowed: boolean;
  /** Why access was granted/denied */
  reason: FeatureAccessReason;
  /** Minimum tier required (null if admin-only or feature not found) */
  requiredTier: SubscriptionTier | null;
  /** Whether to show the upgrade prompt */
  showUpgrade: boolean;
  /** Feature display name (for upgrade prompts) */
  featureName: string;
}

// ─── In-Memory Cache ────────────────────────────────────────────
// Cache feature flags to avoid hitting the DB on every check.
// TTL: 60 seconds. Invalidated manually via invalidateFeatureCache().

let cachedFlags: FeatureFlagData[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Set the cached feature flags (used by server-side fetcher).
 */
export function setFeatureCache(flags: FeatureFlagData[]): void {
  cachedFlags = flags;
  cacheTimestamp = Date.now();
}

/**
 * Get cached feature flags if still valid.
 */
export function getCachedFlags(): FeatureFlagData[] | null {
  if (cachedFlags && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFlags;
  }
  return null;
}

/**
 * Invalidate the feature flag cache.
 * Call this when an admin creates/updates/deletes a feature flag.
 */
export function invalidateFeatureCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}

// ─── Core Access Check ──────────────────────────────────────────

/**
 * Check if a user has access to a specific feature.
 * 
 * This is a PURE function — does not hit the database.
 * Feature flags must be provided (from cache or /api/features).
 * 
 * @param featureKey - The feature to check
 * @param userRole - The user's role (null if not authenticated)
 * @param userTier - The user's subscription tier
 * @param featureFlags - Array of feature flag data (from DB or API)
 */
export function checkFeatureAccess(
  featureKey: FeatureKey | string,
  userRole: UserRole | null,
  userTier: SubscriptionTier,
  featureFlags: FeatureFlagData[]
): FeatureCheckResult {
  // ── Rule 1: DEV_MODE bypass ─────────────────────────────────
  if (allowAllFeatures()) {
    return {
      allowed: true,
      reason: 'dev_mode',
      requiredTier: null,
      showUpgrade: false,
      featureName: featureKey,
    };
  }

  // ── Not authenticated ──────────────────────────────────────
  if (!userRole) {
    return {
      allowed: false,
      reason: 'not_authenticated',
      requiredTier: null,
      showUpgrade: false,
      featureName: featureKey,
    };
  }

  // ── Find the feature flag ──────────────────────────────────
  const feature = featureFlags.find((f) => f.key === featureKey);

  if (!feature) {
    // Feature not found in DB — block by default (fail-closed)
    // Admin still gets through
    if (userRole === 'Admin') {
      return {
        allowed: true,
        reason: 'admin_override',
        requiredTier: null,
        showUpgrade: false,
        featureName: featureKey,
      };
    }
    return {
      allowed: false,
      reason: 'feature_not_found',
      requiredTier: null,
      showUpgrade: false,
      featureName: featureKey,
    };
  }

  // ── Rule 2: Admin override ─────────────────────────────────
  if (userRole === 'Admin') {
    return {
      allowed: true,
      reason: 'admin_override',
      requiredTier: null,
      showUpgrade: false,
      featureName: feature.name,
    };
  }

  // ── Rule 3: Feature globally disabled ──────────────────────
  if (!feature.enabled) {
    return {
      allowed: false,
      reason: 'feature_disabled',
      requiredTier: null,
      showUpgrade: false,
      featureName: feature.name,
    };
  }

  // ── Rule 4: Admin-only feature ─────────────────────────────
  if (feature.adminOnly) {
    return {
      allowed: false,
      reason: 'admin_only',
      requiredTier: null,
      showUpgrade: false,
      featureName: feature.name,
    };
  }

  // ── Rule 5: Check subscription tier ────────────────────────
  if (feature.allowedTiers.includes(userTier)) {
    return {
      allowed: true,
      reason: 'tier_allowed',
      requiredTier: null,
      showUpgrade: false,
      featureName: feature.name,
    };
  }

  // ── Rule 6: Tier insufficient — show upgrade ──────────────
  // Determine the minimum tier needed
  const requiredTier: SubscriptionTier = feature.allowedTiers.includes('pro')
    ? 'pro'
    : 'starter';

  return {
    allowed: false,
    reason: 'tier_insufficient',
    requiredTier,
    showUpgrade: true,
    featureName: feature.name,
  };
}

