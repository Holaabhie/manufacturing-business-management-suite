import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSessionUser } from '@/lib/auth-session';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const profile = await db.collection("users").findOne({ _id: user._id });

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
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
