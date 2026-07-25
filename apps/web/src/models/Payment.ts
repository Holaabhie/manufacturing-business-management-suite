import { Schema, model, models, Document } from 'mongoose';

// ─── Types ──────────────────────────────────────────────────────
export type PaymentStatus = 'created' | 'paid' | 'failed';
export type PlanType = 'pro_monthly' | 'pro_yearly';

export interface IPayment extends Document {
  /** Reference to the user who made the payment */
  userId: string;
  /** Razorpay order ID (unique per payment attempt) */
  razorpayOrderId: string;
  /** Razorpay payment ID (populated after successful payment) */
  razorpayPaymentId?: string;
  /** Razorpay signature (for server-side verification) */
  razorpaySignature?: string;
  /** Amount in paise (INR). e.g., 49900 = INR 499.00 */
  amount: number;
  /** Currency code */
  currency: string;
  /** Payment status */
  status: PaymentStatus;
  /** Plan being purchased */
  plan: PlanType;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────
const PaymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: undefined,
    },
    razorpaySignature: {
      type: String,
      default: undefined,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
    },
    plan: {
      type: String,
      enum: ['pro_monthly', 'pro_yearly'],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

// ─── Indexes ────────────────────────────────────────────────────
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ razorpayOrderId: 1 });
PaymentSchema.index({ createdAt: -1 });

export const Payment =
  models.Payment || model<IPayment>('Payment', PaymentSchema);
