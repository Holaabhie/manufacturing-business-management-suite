/**
 * Razorpay Plan Configuration
 * 
 * Centralized pricing for all subscription plans.
 * Amounts are in paise (INR). 1 rupee = 100 paise.
 */

export type PlanId = 'pro_monthly' | 'pro_yearly';

export interface PlanConfig {
  id: PlanId;
  name: string;
  /** Price in paise (e.g. 49900 = ₹499.00) */
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  /** Mark as "popular" plan in UI */
  popular?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 99900, // ₹999.00
    currency: 'INR',
    interval: 'monthly',
    features: [
      'Unlimited projects',
      'AI Assistant',
      'PDF & CSV export',
      'Custom branding',
      'API access',
      'Priority support',
      'Advanced analytics',
    ],
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    price: 999900, // ₹9,999.00 (save ₹1,989)
    currency: 'INR',
    interval: 'yearly',
    features: [
      'Unlimited projects',
      'AI Assistant',
      'PDF & CSV export',
      'Custom branding',
      'API access',
      'Priority support',
      'Advanced analytics',
      '2 months free',
    ],
    popular: true,
  },
} as const;

/** Get display price in rupees (from paise) */
export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

/** Calculate yearly savings */
export function getYearlySavings(): number {
  return PLANS.pro_monthly.price * 12 - PLANS.pro_yearly.price;
}
