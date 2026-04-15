"use client";

/**
 * useUpgrade — Hook for managing the upgrade checkout flow
 * 
 * Phase 2: Stub implementation.
 * Phase 5: Will integrate with Razorpay checkout.
 * 
 * Usage:
 * ```tsx
 * const { openCheckout, isProcessing, error } = useUpgrade();
 * <button onClick={() => openCheckout('pro_monthly')}>Upgrade</button>
 * ```
 */

import { useState, useCallback } from 'react';

export type PlanId = 'pro_monthly' | 'pro_yearly';

interface UseUpgradeReturn {
  /** Open the Razorpay checkout for a specific plan */
  openCheckout: (plan: PlanId) => Promise<void>;
  /** Whether a checkout is currently being processed */
  isProcessing: boolean;
  /** Error message if checkout failed */
  error: string | null;
  /** Clear the error state */
  clearError: () => void;
}

export function useUpgrade(): UseUpgradeReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCheckout = useCallback(async (plan: PlanId) => {
    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Phase 5 — Full Razorpay integration
      // 1. POST /api/razorpay/create-order → get orderId
      // 2. Load Razorpay script dynamically
      // 3. Open Razorpay checkout modal
      // 4. On success → POST /api/razorpay/verify-payment
      // 5. On verification → update user context, show success toast

      console.warn(
        `🚧 useUpgrade: Checkout for plan "${plan}" not yet implemented. ` +
        'Razorpay integration coming in Phase 5.'
      );

      // Simulate a delay for UI testing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setError('Payment integration coming soon. Check back later!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    openCheckout,
    isProcessing,
    error,
    clearError,
  };
}
