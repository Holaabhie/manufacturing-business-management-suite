import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSessionUser, type UserDoc, type MongoUserDoc } from '@/lib/auth-session';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userQueryId = ObjectId.isValid(user._id) ? new ObjectId(user._id) : user._id;
    const profile = await db.collection<MongoUserDoc>("users").findOne({ _id: userQueryId });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let stripeSubscription = null;
    if (profile.stripe_subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      } catch (e) {
        console.error('Error fetching Stripe subscription:', e);
      }
    }

    return NextResponse.json({
      tier: profile.subscription_tier || 'starter',
      status: profile.subscription_status || 'active',
      currentPeriodEnd: profile.subscription_current_period_end,
      stripeSubscriptionId: profile.stripe_subscription_id,
      stripeCustomerId: profile.stripe_customer_id,
      cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
    });
  } catch (error: unknown) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
