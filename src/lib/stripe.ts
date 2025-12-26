import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 0,
    priceId: null,
    features: [
      'Up to 50 inventory items',
      'Up to 100 orders/month',
      'Basic reports',
      '1 user',
    ],
    limits: {
      inventoryItems: 50,
      ordersPerMonth: 100,
      users: 1,
    },
  },
  pro: {
    name: 'Pro',
    price: 999,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Unlimited inventory items',
      'Unlimited orders',
      'Advanced analytics',
      'Data export (Excel/PDF)',
      'Priority support',
      'Up to 10 users',
    ],
    limits: {
      inventoryItems: Infinity,
      ordersPerMonth: Infinity,
      users: 10,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
