"use client";

/**
 * Razorpay Standard Web Checkout Client Integration
 * 
 * Dynamically loads Razorpay checkout script, opens checkout modal,
 * and handles signature verification upon payment completion.
 */

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (res: { error?: { description?: string; reason?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (config: Record<string, unknown>) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the Razorpay checkout.js script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  // Reuse in-flight loading promise to avoid duplicate injections
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    // If a stale or failed script tag is already in DOM without window.Razorpay, clean it up
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    );
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    // Safety timeout in case of silent drops or blocked requests (10s)
    const timeoutId = setTimeout(() => {
      console.warn('Razorpay checkout.js script loading timed out');
      script.remove();
      scriptLoadingPromise = null;
      resolve(false);
    }, 10000);

    script.onload = () => {
      clearTimeout(timeoutId);
      scriptLoadingPromise = null;
      resolve(true);
    };

    script.onerror = (e) => {
      clearTimeout(timeoutId);
      console.error('Failed to load Razorpay checkout.js script:', e);
      script.remove();
      scriptLoadingPromise = null;
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export interface CheckoutOptions {
  /** Amount in paise (1 INR = 100 paise). Minimum 100 paise */
  amount: number;
  /** Currency code (default: 'INR') */
  currency?: string;
  /** Name displayed on modal (default: 'IND Manager') */
  name?: string;
  /** Description of transaction or plan */
  description?: string;
  /** Optional pre-created order ID. If omitted, /api/create-order will be called automatically */
  order_id?: string;
  /** Optional receipt identifier */
  receipt?: string;
  /** Optional plan identifier (e.g. 'pro_monthly' | 'pro_yearly') */
  plan?: string;
  /** Optional customer prefill details */
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  /** Optional brand / theme hex color */
  themeColor?: string;
  /** Callback fired when payment is successful and signature is verified by backend */
  onSuccess?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    verificationResult: unknown;
  }) => void;
  /** Callback fired on error during order creation, modal payment, or signature verification */
  onError?: (errorMessage: string) => void;
  /** Callback fired when user closes/dismisses checkout modal without completing payment */
  onDismiss?: () => void;
}

export async function openRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  const {
    amount,
    currency = 'INR',
    name = 'IND Manager',
    description = 'Order Payment',
    receipt,
    plan,
    prefill,
    themeColor = '#4F46E5',
    onSuccess,
    onError,
    onDismiss,
  } = options;

  try {
    // 1. Ensure Razorpay script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      throw new Error(
        'Unable to load Razorpay payment SDK. Please disable ad-blockers or check your internet connection.'
      );
    }

    // 2. Obtain or generate order_id from backend
    let activeOrderId = options.order_id;
    let orderAmount = amount;
    let orderCurrency = currency;

    if (!activeOrderId) {
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          receipt,
          plan,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || (!orderData.order_id && !orderData.id)) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      activeOrderId = orderData.order_id || orderData.id;
      orderAmount = orderData.amount || amount;
      orderCurrency = orderData.currency || currency;
    }

    const keyId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      'rzp_test_Tot6gwuIkwHrxp';

    let paymentCompleted = false;

    // 3. Configure Razorpay Standard Checkout modal options
    const razorpayConfig = {
      key: keyId,
      amount: orderAmount,
      currency: orderCurrency,
      name,
      description,
      order_id: activeOrderId,
      prefill: {
        name: prefill?.name || '',
        email: prefill?.email || '',
        contact: prefill?.contact || '',
      },
      theme: {
        color: themeColor,
      },
      modal: {
        ondismiss: () => {
          if (!paymentCompleted) {
            console.log('Razorpay modal dismissed by user');
            onDismiss?.();
          }
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        paymentCompleted = true;

        try {
          // 4. Send all three values to backend for signature verification
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(
              verifyData.error || 'Payment signature verification failed'
            );
          }

          onSuccess?.({
            ...response,
            verificationResult: verifyData,
          });
        } catch (verifyError: unknown) {
          const vErr = verifyError instanceof Error ? verifyError.message : 'Payment verification failed on the server';
          console.error('Verification error:', verifyError);
          onError?.(vErr);
        }
      },
    };

    const rzp = new window.Razorpay(razorpayConfig);

    rzp.on('payment.failed', (response: { error?: { description?: string; reason?: string } }) => {
      console.error('Razorpay payment failed:', response.error);
      const errorMsg =
        response.error?.description ||
        response.error?.reason ||
        'Payment failed. Please try again.';
      onError?.(errorMsg);
    });

    rzp.open();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to initiate checkout';
    console.error('Error opening Razorpay checkout:', err);
    onError?.(errorMsg);
  }
}
