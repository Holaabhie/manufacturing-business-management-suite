/**
 * Feature Gate — Server-Only Helpers
 * 
 * This file contains functions that depend on server-only APIs
 * (MongoDB, next/headers via auth-session). It MUST NOT be imported
 * from any client component or file in a client import chain.
 * 
 * The 'server-only' import ensures a build error if this file
 * is accidentally included in a client bundle.
 */

import 'server-only';

import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth-session';
import { allowAllFeatures } from './dev-mode';
import {
  checkFeatureAccess,
  setFeatureCache,
  getCachedFlags,
  type FeatureFlagData,
  type FeatureCheckResult,
  type UserRole,
  type SubscriptionTier,
} from './feature-gate';
import type { FeatureKey } from './feature-flags';

// ─── Server-Side Helpers ────────────────────────────────────────

/**
 * Fetch feature flags from MongoDB (server-side only).
 * Uses the in-memory cache to avoid unnecessary DB calls.
 */
export async function getFeatureFlags(): Promise<FeatureFlagData[]> {
  // Check cache first
  const cached = getCachedFlags();
  if (cached) return cached;

  const db = await getDb();

  const flags = await db
    .collection('featureflags')
    .find({})
    .project<FeatureFlagData>({
      _id: 0,
      key: 1,
      name: 1,
      description: 1,
      allowedTiers: 1,
      adminOnly: 1,
      enabled: 1,
    })
    .toArray();

  // Update cache
  setFeatureCache(flags);

  return flags;
}

/**
 * Server-side: Check feature access for the current session user.
 * Combines getFeatureFlags() + getSessionUser() + checkFeatureAccess().
 * 
 * Usage in API routes or server components:
 * ```ts
 * const result = await checkFeatureForCurrentUser('ai_assistant');
 * if (!result.allowed) return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
 * ```
 */
export async function checkFeatureForCurrentUser(
  featureKey: FeatureKey | string
): Promise<FeatureCheckResult> {
  // DEV_MODE shortcut — avoid DB calls entirely
  if (allowAllFeatures()) {
    return {
      allowed: true,
      reason: 'dev_mode',
      requiredTier: null,
      showUpgrade: false,
      featureName: featureKey,
    };
  }

  const user = await getSessionUser();

  if (!user) {
    return {
      allowed: false,
      reason: 'not_authenticated',
      requiredTier: null,
      showUpgrade: false,
      featureName: featureKey,
    };
  }

  const flags = await getFeatureFlags();
  const userRole = (user.role as UserRole) || 'Staff';
  const userTier = (user.subscription_tier as SubscriptionTier) || 'starter';

  return checkFeatureAccess(featureKey, userRole, userTier, flags);
}
