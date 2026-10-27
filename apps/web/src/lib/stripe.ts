import Stripe from 'stripe';

let _stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripeInstance) {
    return _stripeInstance;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (!key) {
    if (isBuildPhase) {
      _stripeInstance = new Stripe('sk_test_placeholder_build', {
        apiVersion: '2025-10-29.clover',
      });
      return _stripeInstance;
    }

    throw new Error(
      "FATAL: STRIPE_SECRET_KEY environment variable is not set. " +
      "Stripe operations cannot be performed without a valid secret key. " +
      "Set STRIPE_SECRET_KEY in your environment variables to use Stripe integration."
    );
  }

  _stripeInstance = new Stripe(key, {
    apiVersion: '2025-10-29.clover',
  });
  return _stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe();
    const value = Reflect.get(instance, prop);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
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
