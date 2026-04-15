"use client";

/**
 * useFeatureGate — Hook for checking feature access
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { isAllowed, isLoading, showUpgrade, reason } = useFeatureGate('ai_assistant');
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (!isAllowed) return <UpgradePrompt feature="ai_assistant" />;
 *   return <AIAssistant />;
 * }
 * ```
 */

import { useMemo, useState, useCallback } from 'react';
import { useFeatureFlags } from '@/lib/features/feature-context';
import type { FeatureKey } from '@/lib/features/feature-flags';
import type { FeatureCheckResult, FeatureAccessReason } from '@/lib/features/feature-gate';

interface UseFeatureGateReturn {
  /** Whether the user has access to this feature */
  isAllowed: boolean;
  /** Whether feature flags are still loading */
  isLoading: boolean;
  /** Whether to show an upgrade prompt */
  showUpgrade: boolean;
  /** The reason for the access decision */
  reason: FeatureAccessReason;
  /** Feature display name */
  featureName: string;
  /** Required subscription tier (null if not applicable) */
  requiredTier: 'starter' | 'pro' | null;
  /** Whether the upgrade modal is open */
  isUpgradeModalOpen: boolean;
  /** Open the upgrade modal */
  openUpgradeModal: () => void;
  /** Close the upgrade modal */
  closeUpgradeModal: () => void;
}

export function useFeatureGate(featureKey: FeatureKey | string): UseFeatureGateReturn {
  const { checkAccess, isLoading } = useFeatureFlags();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const result: FeatureCheckResult = useMemo(
    () => checkAccess(featureKey),
    [checkAccess, featureKey]
  );

  const openUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
  }, []);

  return {
    isAllowed: result.allowed,
    isLoading,
    showUpgrade: result.showUpgrade,
    reason: result.reason,
    featureName: result.featureName,
    requiredTier: result.requiredTier,
    isUpgradeModalOpen,
    openUpgradeModal,
    closeUpgradeModal,
  };
}
