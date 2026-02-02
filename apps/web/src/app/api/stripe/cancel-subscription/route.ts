import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSessionUser } from '@/lib/auth-session';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cancelImmediately = false } = await request.json();

    const db = await getDb();
    const profile = await db.collection("users").findOne({ _id: user._id });

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (cancelImmediately) {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            subscription_tier: 'starter',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            subscription_current_period_end: null,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            subscription_status: 'canceling',
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
