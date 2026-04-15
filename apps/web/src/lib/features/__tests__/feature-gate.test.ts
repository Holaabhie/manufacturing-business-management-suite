/**
 * Feature Gate Engine — Unit Tests
 * 
 * Tests the core checkFeatureAccess() pure function across all 6 decision branches.
 * Run with: cd apps/web && npx vitest run src/lib/features/__tests__/feature-gate.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkFeatureAccess,
  invalidateFeatureCache,
  setFeatureCache,
  getCachedFlags,
  type FeatureFlagData,
} from '../feature-gate';

// ─── Test Fixtures ──────────────────────────────────────────────

const mockFlags: FeatureFlagData[] = [
  {
    key: 'ai_assistant',
    name: 'AI Assistant',
    allowedTiers: ['pro'],
    adminOnly: false,
    enabled: true,
  },
  {
    key: 'admin_panel',
    name: 'Admin Panel',
    allowedTiers: ['starter', 'pro'],
    adminOnly: true,
    enabled: true,
  },
  {
    key: 'basic_features',
    name: 'Basic Features',
    allowedTiers: ['starter', 'pro'],
    adminOnly: false,
    enabled: true,
  },
  {
    key: 'disabled_feature',
    name: 'Disabled Feature',
    allowedTiers: ['starter', 'pro'],
    adminOnly: false,
    enabled: false, // globally disabled
  },
  {
    key: 'export_pdf',
    name: 'Export to PDF',
    allowedTiers: ['pro'],
    adminOnly: false,
    enabled: true,
  },
];

// ─── Tests ──────────────────────────────────────────────────────

describe('checkFeatureAccess', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env to clean state (no DEV_MODE)
    process.env = { ...originalEnv };
    delete process.env.DEV_MODE;
    delete process.env.NEXT_PUBLIC_DEV_MODE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── Rule 2: Admin Override ────────────────────────────────
  describe('Admin Override', () => {
    it('should allow Admin access to any feature', () => {
      const result = checkFeatureAccess('ai_assistant', 'Admin', 'starter', mockFlags);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('admin_override');
      expect(result.showUpgrade).toBe(false);
    });

    it('should allow Admin access to admin-only features', () => {
      const result = checkFeatureAccess('admin_panel', 'Admin', 'starter', mockFlags);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('admin_override');
    });

    it('should allow Admin access to disabled features', () => {
      const result = checkFeatureAccess('disabled_feature', 'Admin', 'starter', mockFlags);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('admin_override');
    });

    it('should allow Admin access to unknown features', () => {
      const result = checkFeatureAccess('nonexistent_feature', 'Admin', 'starter', mockFlags);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('admin_override');
    });
  });

  // ── Rule 3: Feature Disabled ──────────────────────────────
  describe('Feature Disabled', () => {
    it('should block non-Admin when feature is globally disabled', () => {
      const result = checkFeatureAccess('disabled_feature', 'Staff', 'pro', mockFlags);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('feature_disabled');
      expect(result.showUpgrade).toBe(false);
    });
  });

  // ── Rule 4: Admin-Only Feature ────────────────────────────
  describe('Admin-Only Features', () => {
    it('should block Staff from admin-only features', () => {
      const result = checkFeatureAccess('admin_panel', 'Staff', 'pro', mockFlags);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('admin_only');
      expect(result.showUpgrade).toBe(false);
    });
  });

  // ── Rule 5: Tier Allowed ──────────────────────────────────
  describe('Tier Allowed', () => {
    it('should allow Pro tier access to Pro features', () => {
      const result = checkFeatureAccess('ai_assistant', 'Staff', 'pro', mockFlags);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('tier_allowed');
      expect(result.showUpgrade).toBe(false);
    });

    it('should allow Starter tier access to basic features', () => {
      const result = checkFeatureAccess('basic_features', 'Staff', 'starter', mockFlags);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('tier_allowed');
    });

    it('should allow Pro tier access to basic features', () => {
      const result = checkFeatureAccess('basic_features', 'Staff', 'pro', mockFlags);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('tier_allowed');
    });
  });

  // ── Rule 6: Tier Insufficient → Show Upgrade ─────────────
  describe('Tier Insufficient', () => {
    it('should block Starter from Pro-only features with upgrade prompt', () => {
      const result = checkFeatureAccess('ai_assistant', 'Staff', 'starter', mockFlags);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('tier_insufficient');
      expect(result.showUpgrade).toBe(true);
      expect(result.requiredTier).toBe('pro');
    });

    it('should block Starter from export_pdf with upgrade prompt', () => {
      const result = checkFeatureAccess('export_pdf', 'Staff', 'starter', mockFlags);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('tier_insufficient');
      expect(result.showUpgrade).toBe(true);
    });
  });

  // ── Not Authenticated ─────────────────────────────────────
  describe('Not Authenticated', () => {
    it('should block unauthenticated users', () => {
      const result = checkFeatureAccess('basic_features', null, 'starter', mockFlags);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_authenticated');
      expect(result.showUpgrade).toBe(false);
    });
  });

  // ── Feature Not Found ─────────────────────────────────────
  describe('Feature Not Found', () => {
    it('should block access to unknown features (fail-closed)', () => {
      const result = checkFeatureAccess('nonexistent_feature', 'Staff', 'pro', mockFlags);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('feature_not_found');
    });
  });
});

// ─── Cache Tests ────────────────────────────────────────────────

describe('Feature Flag Cache', () => {
  beforeEach(() => {
    invalidateFeatureCache();
  });

  it('should return null when cache is empty', () => {
    expect(getCachedFlags()).toBeNull();
  });

  it('should return cached flags when set', () => {
    setFeatureCache(mockFlags);
    expect(getCachedFlags()).toEqual(mockFlags);
  });

  it('should clear cache on invalidation', () => {
    setFeatureCache(mockFlags);
    invalidateFeatureCache();
    expect(getCachedFlags()).toBeNull();
  });
});
