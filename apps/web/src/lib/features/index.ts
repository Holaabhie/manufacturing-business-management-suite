/**
 * Feature Gate System — Barrel Export
 */

// Feature key registry
export { FEATURES, ALL_FEATURE_KEYS, FEATURE_DISPLAY_INFO } from './feature-flags';
export type { FeatureKey } from './feature-flags';

// Core gate logic (client-safe)
export {
  checkFeatureAccess,
  invalidateFeatureCache,
  setFeatureCache,
  getCachedFlags,
} from './feature-gate';

// Server-only helpers
export {
  getFeatureFlags,
  checkFeatureForCurrentUser,
} from './feature-gate.server';
export type {
  FeatureFlagData,
  FeatureCheckResult,
  FeatureAccessReason,
} from './feature-gate';

// Dev mode
export { isDevMode, allowAllFeatures } from './dev-mode';
