"use client";

import { useState } from 'react';
import { Loader2, CreditCard } from 'lucide-react';
import { openRazorpayCheckout } from '@/lib/razorpay/checkout';
import { toast } from 'sonner';

export interface RazorpayCheckoutButtonProps {
  /** Amount in paise (1 INR = 100 paise). Minimum 100 paise */
  amount: number;
  /** Currency code (default: 'INR') */
  currency?: string;
  /** Merchant or company name shown on modal */
  name?: string;
  /** Description shown on modal */
  description?: string;
  /** Plan identifier (e.g. 'pro_monthly', 'pro_yearly') */
  plan?: string;
  /** Label for the button */
  buttonText?: string;
  /** Additional CSS class names */
  className?: string;
  /** Optional customer prefill data */
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  /** Callback fired after successful payment and signature verification */
  onSuccess?: (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    verificationResult: any;
  }) => void;
  /** Callback fired on error */
  onError?: (error: string) => void;
  /** Callback fired when user closes modal */
  onDismiss?: () => void;
  /** Disabled state */
  disabled?: boolean;
}

export function RazorpayCheckoutButton({
  amount,
  currency = 'INR',
  name = 'IND Manager',
  description = 'Payment Checkout',
  plan,
  buttonText,
  className = '',
  prefill,
  onSuccess,
  onError,
  onDismiss,
  disabled = false,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const displayAmount = `₹${(amount / 100).toLocaleString('en-IN')}`;
  const label = buttonText || `Pay ${displayAmount} with Razorpay`;

  const handleCheckout = async () => {
    if (loading || disabled) return;

    if (amount < 100) {
      toast.error('Minimum payment amount is 100 paise (₹1.00)');
      return;
    }

    setLoading(true);

    await openRazorpayCheckout({
      amount,
      currency,
      name,
      description,
      plan,
      prefill,
      onSuccess: (res) => {
        setLoading(false);
        toast.success(`Payment successful! Payment ID: ${res.razorpay_payment_id}`);
        onSuccess?.(res);
      },
      onError: (errMsg) => {
        setLoading(false);
        toast.error(errMsg);
        onError?.(errMsg);
      },
      onDismiss: () => {
        setLoading(false);
        toast.info('Payment cancelled by user');
        onDismiss?.();
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Opening Checkout...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
