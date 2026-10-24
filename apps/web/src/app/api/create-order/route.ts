import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay/server';
import { getSessionUser } from '@/lib/auth-session';
import { getDb } from '@/lib/mongodb';

import { PLANS, type PlanId } from '@/lib/razorpay/plans';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const { plan, currency = 'INR', receipt, notes } = body;

    // Enforce server-side pricing from PLANS map to prevent client price tampering
    let orderAmount: number;
    let validatedPlan: string = 'custom';

    if (plan && plan in PLANS) {
      validatedPlan = plan;
      orderAmount = PLANS[plan as PlanId].price;
    } else if (body.amount) {
      // Fallback for custom amount only if plan is not a known tier
      const parsed = Number(body.amount);
      if (isNaN(parsed) || parsed < 100) {
        return NextResponse.json(
          { error: 'Invalid amount: Minimum amount is 100 paise (₹1.00)' },
          { status: 400 }
        );
      }
      orderAmount = parsed;
    } else {
      return NextResponse.json(
        { error: 'Invalid request: A valid plan (pro_monthly, pro_yearly) or amount is required' },
        { status: 400 }
      );
    }

    // Optional user session context
    let currentUser: any = null;
    try {
      currentUser = await getSessionUser();
    } catch {
      // Unauthenticated callers (e.g. public checkout, testing) are permitted
    }

    const userId = body.userId || (currentUser?._id ? currentUser._id.toString() : null);

    // Call Razorpay Order Creation API
    const order = await createRazorpayOrder({
      amount: orderAmount,
      currency,
      receipt: receipt || (validatedPlan ? `rcpt_${validatedPlan}_${Date.now()}` : undefined),
      notes: {
        ...(notes || {}),
        plan: validatedPlan,
        userId: userId || 'anonymous',
      },
    });

    // Best-effort database recording in payments collection
    try {
      const db = await getDb();
      if (db) {
        await db.collection('payments').insertOne({
          userId: userId || 'anonymous',
          razorpayOrderId: order.order_id,
          amount: order.amount,
          currency: order.currency,
          status: 'created',
          plan: validatedPlan,
          receipt: order.receipt,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (dbError) {
      console.warn('Non-blocking: could not persist initial payment record to DB:', dbError);
    }

    // Return exact requested schema: { order_id, amount, currency } along with id for standard Razorpay checkout compatibility
    return NextResponse.json({
      order_id: order.order_id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error: any) {
    console.error('Error in /api/create-order:', error);

    // Check for Razorpay authentication failures (invalid credentials)
    if (
      error?.statusCode === 401 ||
      error?.status === 401 ||
      error?.error?.code === 'BAD_REQUEST_ERROR' && error?.error?.description?.toLowerCase().includes('auth') ||
      error?.message?.toLowerCase().includes('credentials missing')
    ) {
      return NextResponse.json(
        { error: 'Razorpay authentication failed: Invalid or missing API credentials' },
        { status: 401 }
      );
    }

    // Check for client validation error (e.g. minimum amount)
    if (error?.statusCode === 400 || error?.status === 400) {
      return NextResponse.json(
        { error: error.message || 'Bad Request' },
        { status: 400 }
      );
    }

    // Standard Razorpay API / Server Error
    const description =
      error?.error?.description ||
      error?.message ||
      'Failed to create Razorpay order';

    return NextResponse.json(
      { error: description },
      { status: 500 }
    );
  }
}
