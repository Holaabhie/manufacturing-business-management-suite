"use client";

/**
 * UpgradePrompt — Inline Upgrade CTA for Gated Features
 * 
 * Displayed when a free-tier user tries to access a Pro feature.
 * Shows feature info, pricing, and a CTA button.
 * 
 * Usage:
 * ```tsx
 * <UpgradePrompt feature="ai_assistant" />
 * <UpgradePrompt feature="export_pdf" variant="compact" />
 * ```
 */

import { useState } from 'react';
import { FEATURE_DISPLAY_INFO, type FeatureKey } from '@/lib/features/feature-flags';
import { PLANS, type PlanId } from '@/lib/razorpay/plans';

interface UpgradePromptProps {
  /** The feature key that triggered the upgrade prompt */
  feature: FeatureKey | string;
  /** Visual variant */
  variant?: 'default' | 'compact' | 'card';
  /** Callback when user clicks upgrade */
  onUpgrade?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function UpgradePrompt({
  feature,
  variant = 'default',
  onUpgrade,
  className = '',
}: UpgradePromptProps) {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const displayInfo = FEATURE_DISPLAY_INFO[feature as FeatureKey];

  const featureName = displayInfo?.name || feature;
  const featureIcon = displayInfo?.icon || '🔒';
  const featureDescription = displayInfo?.description || 'This feature requires a Pro plan';

  const monthlyPrice = PLANS.pro_monthly.price / 100;

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 ${className}`}>
        <span className="text-sm">🔒</span>
        <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
          Pro feature
        </span>
        <button
          onClick={onUpgrade}
          className="ml-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
        >
          Upgrade →
        </button>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30">
            <span className="text-2xl">{featureIcon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {featureName}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {featureDescription}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={onUpgrade}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
              >
                Upgrade to Pro — ₹{monthlyPrice}/mo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant — full upgrade prompt
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{featureIcon}</span>
          <div>
            <h3 className="text-lg font-bold text-white">{featureName}</h3>
            <p className="text-sm text-violet-200">{featureDescription}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">₹{monthlyPrice}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
          <span className="ml-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Save ₹{((PLANS.pro_monthly.price * 12 - PLANS.pro_yearly.price) / 100).toFixed(0)} yearly
          </span>
        </div>

        {/* Quick feature list */}
        <ul className="space-y-2 mb-5">
          {['Unlimited Projects', 'AI Assistant', 'PDF & CSV Export', 'API Access', 'Priority Support'].map(
            (feat) => (
              <li key={feat} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-emerald-500">✓</span>
                {feat}
              </li>
            )
          )}
        </ul>

        {/* See all features */}
        <button
          onClick={() => setShowAllFeatures(!showAllFeatures)}
          className="mb-4 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
        >
          {showAllFeatures ? 'Hide all Pro features ↑' : 'See all Pro features ↓'}
        </button>

        {showAllFeatures && (
          <ul className="space-y-2 mb-5 border-t border-gray-200 dark:border-gray-700 pt-3">
            {PLANS.pro_monthly.features.map((feat) => (
              <li key={feat} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="text-violet-500">✦</span>
                {feat}
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <button
          onClick={onUpgrade}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30 transition-all hover:shadow-xl hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
        >
          ✨ Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
