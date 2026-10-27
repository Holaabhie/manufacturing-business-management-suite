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
import { PLANS, type PlanId } from '@/lib/razorpay/plans';
import { openRazorpayCheckout } from '@/lib/razorpay/checkout';
import { toast } from 'sonner';

export type { PlanId };

interface UseUpgradeReturn {
  /** Open the Razorpay checkout for a specific plan */
  openCheckout: (plan: PlanId, callbacks?: { onSuccess?: () => void; onError?: (err: string) => void }) => Promise<void>;
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

  const openCheckout = useCallback(async (
    plan: PlanId,
    callbacks?: { onSuccess?: () => void; onError?: (err: string) => void }
  ) => {
    setIsProcessing(true);
    setError(null);

    const planConfig = PLANS[plan] || PLANS.pro_monthly;

    try {
      await openRazorpayCheckout({
        amount: planConfig.price,
        currency: planConfig.currency,
        name: 'IND Manager Pro',
        description: `${planConfig.name} Subscription`,
        plan: planConfig.id,
        onSuccess: (data) => {
          setIsProcessing(false);
          setError(null);
          toast.success(`Successfully upgraded to ${planConfig.name}!`);
          callbacks?.onSuccess?.();
        },
        onError: (errMessage) => {
          setIsProcessing(false);
          setError(errMessage);
          toast.error(errMessage);
          callbacks?.onError?.(errMessage);
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      setError(msg);
      toast.error(msg);
      setIsProcessing(false);
      callbacks?.onError?.(msg);
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
