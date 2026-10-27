import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSessionUser, type UserDoc, type MongoUserDoc } from '@/lib/auth-session';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing required field: priceId' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userQueryId = ObjectId.isValid(user._id) ? new ObjectId(user._id) : user._id;
    const profile = await db.collection<MongoUserDoc>("users").findOne({ _id: userQueryId });

    if (profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user._id.toString() },
      });
      customerId = customer.id;

      await db.collection<MongoUserDoc>("users").updateOne(
        { _id: userQueryId },
        { $set: { stripe_customer_id: customerId } }
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      metadata: { user_id: user._id.toString() },
    });

    const invoice = subscription.latest_invoice as { payment_intent?: { client_secret?: string } };
    const pendingSetupIntent = subscription.pending_setup_intent as { client_secret?: string };
    const paymentIntent = invoice?.payment_intent;

    let clientSecret: string;
    let confirmationType: 'payment' | 'setup';

    if (pendingSetupIntent?.client_secret) {
      clientSecret = pendingSetupIntent.client_secret;
      confirmationType = 'setup';
    } else if (paymentIntent?.client_secret) {
      clientSecret = paymentIntent.client_secret;
      confirmationType = 'payment';
    } else {
      await stripe.subscriptions.cancel(subscription.id);
      return NextResponse.json(
        { error: 'Failed to get client secret from subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      confirmationType,
    });
  } catch (error: unknown) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
