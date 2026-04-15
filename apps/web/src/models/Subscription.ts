import { Schema, model, models, Document } from 'mongoose';

// ─── Types ──────────────────────────────────────────────────────
export type SubscriptionPlan = 'starter' | 'pro_monthly' | 'pro_yearly';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'past_due';

export interface ISubscription extends Document {
  /** Reference to the user (1:1 relationship) */
  userId: string;
  /** Current plan */
  plan: SubscriptionPlan;
  /** Subscription status */
  status: SubscriptionStatus;
  /** Razorpay customer ID */
  razorpayCustomerId?: string;
  /** Razorpay subscription ID (for recurring payments) */
  razorpaySubscriptionId?: string;
  /** Latest Razorpay payment ID */
  razorpayPaymentId?: string;
  /** Current billing period start */
  currentPeriodStart?: Date;
  /** Current billing period end */
  currentPeriodEnd?: Date;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────
const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['starter', 'pro_monthly', 'pro_yearly'],
      default: 'starter',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'past_due'],
      default: 'active',
    },
    razorpayCustomerId: {
      type: String,
      default: undefined,
    },
    razorpaySubscriptionId: {
      type: String,
      default: undefined,
    },
    razorpayPaymentId: {
      type: String,
      default: undefined,
    },
    currentPeriodStart: {
      type: Date,
      default: undefined,
    },
    currentPeriodEnd: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'subscriptions',
  }
);

// ─── Indexes ────────────────────────────────────────────────────
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1 }); // For expiry checks

export const Subscription =
  models.Subscription || model<ISubscription>('Subscription', SubscriptionSchema);
