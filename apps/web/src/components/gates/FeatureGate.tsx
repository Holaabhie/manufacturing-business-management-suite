"use client";

/**
 * FeatureGate — Declarative Component for Feature Access Control
 * 
 * Usage:
 * ```tsx
 * // Simple gate
 * <FeatureGate feature="ai_assistant">
 *   <AIAssistantPanel />
 * </FeatureGate>
 * 
 * // With custom fallback
 * <FeatureGate feature="export_pdf" fallback={<UpgradeCard />}>
 *   <ExportPDFButton />
 * </FeatureGate>
 * 
 * // Render props for fine-grained control
 * <FeatureGate feature="analytics">
 *   {({ allowed, showUpgrade, reason }) => (
 *     allowed ? <Dashboard /> : <LockedOverlay />
 *   )}
 * </FeatureGate>
 * ```
 */

import { type ReactNode } from 'react';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import type { FeatureKey } from '@/lib/features/feature-flags';
import type { FeatureAccessReason } from '@/lib/features/feature-gate';

// ─── Types ──────────────────────────────────────────────────────

interface RenderPropsArgs {
  allowed: boolean;
  showUpgrade: boolean;
  reason: FeatureAccessReason;
  featureName: string;
  isLoading: boolean;
  openUpgradeModal: () => void;
}

interface FeatureGateProps {
  /** Feature key to check access for */
  feature: FeatureKey | string;
  /** 
   * Children: either ReactNode elements or a render function.
   * If a function, receives { allowed, showUpgrade, reason } args.
   */
  children: ReactNode | ((args: RenderPropsArgs) => ReactNode);
  /** Optional custom fallback when access is denied (default: UpgradePrompt) */
  fallback?: ReactNode;
  /** If true, render nothing while loading (default: true) */
  hideWhileLoading?: boolean;
  /** Optional loading skeleton */
  loadingSkeleton?: ReactNode;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  hideWhileLoading = true,
  loadingSkeleton,
}: FeatureGateProps) {
  const {
    isAllowed,
    isLoading,
    showUpgrade,
    reason,
    featureName,
    openUpgradeModal,
  } = useFeatureGate(feature);

  // Loading state
  if (isLoading) {
    if (loadingSkeleton) return <>{loadingSkeleton}</>;
    if (hideWhileLoading) return null;
  }

  // Render props pattern
  if (typeof children === 'function') {
    return (
      <>
        {children({
          allowed: isAllowed,
          showUpgrade,
          reason,
          featureName,
          isLoading,
          openUpgradeModal,
        })}
      </>
    );
  }

  // User has access
  if (isAllowed) {
    return <>{children}</>;
  }

  // Access denied — show fallback or default upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: inline upgrade prompt
  return (
    <div className="relative rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <span className="text-2xl">🔒</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {featureName || feature}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {reason === 'tier_insufficient'
              ? 'Upgrade to Pro to unlock this feature'
              : reason === 'feature_disabled'
                ? 'This feature is currently unavailable'
                : reason === 'admin_only'
                  ? 'This feature is restricted to administrators'
                  : 'You don\'t have access to this feature'}
          </p>
        </div>
        {showUpgrade && (
          <button
            onClick={openUpgradeModal}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            <span>✨</span>
            <span>Upgrade to Pro</span>
          </button>
        )}
      </div>
    </div>
  );
}
