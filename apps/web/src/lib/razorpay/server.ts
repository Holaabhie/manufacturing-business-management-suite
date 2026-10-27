import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Server-side Razorpay Client & Verification Helpers
 * 
 * NOTE: This module must only be used in server-side contexts
 * (Route Handlers, Server Actions, Server Components).
 * Never import this file in client components.
 */

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials missing. Please define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.'
    );
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

export interface CreateOrderParams {
  /** Amount in paise (1 INR = 100 paise). Minimum 100 paise */
  amount: number;
  /** Currency code, default: 'INR' */
  currency?: string;
  /** Optional receipt identifier */
  receipt?: string;
  /** Optional key-value notes */
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  order_id: string;
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

/**
 * Create a new order via Razorpay API
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const { amount, currency = 'INR', receipt, notes } = params;

  if (!amount || isNaN(amount) || amount < 100) {
    const error = new Error('Amount must be at least 100 paise (₹1.00)') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const client = getRazorpayClient();
  const generatedReceipt = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const order = await client.orders.create({
    amount: Math.round(amount),
    currency: currency.toUpperCase(),
    receipt: generatedReceipt,
    notes: notes || {},
  });

  return {
    order_id: order.id,
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    receipt: order.receipt || generatedReceipt,
    status: order.status,
  };
}

/**
 * Verify Razorpay payment signature
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured');
  }

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Guard timingSafeEqual against unequal buffer lengths
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
