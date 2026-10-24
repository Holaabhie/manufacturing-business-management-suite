import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/razorpay/server';
import { getSessionUser } from '@/lib/auth-session';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

    // Support both snake_case (Razorpay standard) and camelCase payload formats
    const orderId = body.order_id || body.razorpay_order_id || body.orderId;
    const paymentId = body.payment_id || body.razorpay_payment_id || body.paymentId;
    const signature = body.razorpay_signature || body.signature;

    // Validate presence of required fields
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          error: 'Missing required fields: order_id, payment_id, and signature are required for verification',
          received: {
            order_id: Boolean(orderId),
            payment_id: Boolean(paymentId),
            signature: Boolean(signature),
          },
        },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature against KEY_SECRET
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);

    if (!isValid) {
      // "Signature mismatch: return 400, do NOT mark as paid"
      try {
        const db = await getDb();
        if (db) {
          await db.collection('payments').updateOne(
            { razorpayOrderId: orderId },
            {
              $set: {
                status: 'failed',
                razorpayPaymentId: paymentId,
                razorpaySignature: signature,
                failureReason: 'Signature mismatch',
                updatedAt: new Date(),
              },
            }
          );
        }
      } catch (dbError) {
        console.warn('Could not record failed payment in DB:', dbError);
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payment signature. Verification failed.',
        },
        { status: 400 }
      );
    }

    // Signatures match! Mark payment as paid and update user subscription if applicable
    let updatedSubscription = false;
    try {
      const db = await getDb();
      if (db) {
        // Identify current session user
        let currentUser: any = null;
        try {
          currentUser = await getSessionUser();
        } catch {}

        // 1. Verify order exists and verify ownership (orderId must belong to this user)
        const existingOrder = await db.collection('payments').findOne({ razorpayOrderId: orderId });
        if (!existingOrder) {
          return NextResponse.json(
            { error: 'Order not found: No order record exists for this orderId' },
            { status: 400 }
          );
        }

        const callerUserId = currentUser?._id ? currentUser._id.toString() : body.userId;
        if (
          existingOrder.userId &&
          existingOrder.userId !== 'anonymous' &&
          callerUserId &&
          existingOrder.userId !== callerUserId
        ) {
          return NextResponse.json(
            { error: 'Forbidden: This order does not belong to your account' },
            { status: 403 }
          );
        }

        // 2. Check for duplicate activation / replay attack (idempotency check)
        const alreadyPaid = await db.collection('payments').findOne({
          $or: [
            { razorpayPaymentId: paymentId, status: 'paid' },
            { razorpayOrderId: orderId, status: 'paid' },
          ],
        });

        if (alreadyPaid) {
          return NextResponse.json({
            success: true,
            message: 'Payment already verified and processed',
            order_id: orderId,
            payment_id: paymentId,
            subscription_activated: true,
            idempotent: true,
          });
        }

        // 3. Atomically transition payment status from non-paid to paid
        const paymentRecord = await db.collection('payments').findOneAndUpdate(
          { razorpayOrderId: orderId, status: { $ne: 'paid' } },
          {
            $set: {
              status: 'paid',
              razorpayPaymentId: paymentId,
              razorpaySignature: signature,
              updatedAt: new Date(),
            },
          },
          { returnDocument: 'after' }
        );

        if (!paymentRecord) {
          // Concurrent request already marked this order as paid
          return NextResponse.json({
            success: true,
            message: 'Payment already processed by concurrent request',
            order_id: orderId,
            payment_id: paymentId,
            subscription_activated: true,
            idempotent: true,
          });
        }

        // 4. Identify user and plan for subscription provisioning
        const userId =
          callerUserId ||
          paymentRecord?.userId ||
          body.userId;

        const plan = body.plan || paymentRecord?.plan || existingOrder?.plan;

        if (userId && userId !== 'anonymous') {
          const userQuery = ObjectId.isValid(userId)
            ? { _id: new ObjectId(userId) }
            : { _id: userId };

          const isYearly = plan === 'pro_yearly';
          const periodEnd = new Date(
            Date.now() + (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000
          );

          if (plan === 'pro_monthly' || plan === 'pro_yearly') {
            await db.collection('users').updateOne(userQuery, {
              $set: {
                subscription_tier: 'pro',
                subscription_status: 'active',
                subscription_plan: plan,
                subscription_current_period_end: periodEnd,
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                updatedAt: new Date(),
              },
            });

            await db.collection('subscriptions').updateOne(
              { userId: userId.toString() },
              {
                $set: {
                  userId: userId.toString(),
                  plan,
                  status: 'active',
                  razorpayPaymentId: paymentId,
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: periodEnd,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );

            updatedSubscription = true;
          }
        }
      }
    } catch (dbError) {
      console.error('Error updating DB after successful signature verification:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      order_id: orderId,
      payment_id: paymentId,
      subscription_activated: updatedSubscription,
    });
  } catch (error: any) {
    console.error('Error in /api/verify-payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error verifying payment' },
      { status: 500 }
    );
  }
}
