import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, priceId } = await request.json();

    if (!userId || !email || !priceId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, priceId' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.confirmation_secret', 'pending_setup_intent'],
      metadata: { supabase_user_id: userId },
    });

    const invoice = subscription.latest_invoice as any;
    const pendingSetupIntent = subscription.pending_setup_intent as any;

    let clientSecret: string;
    let confirmationType: 'payment' | 'setup';

    if (pendingSetupIntent) {
      clientSecret = pendingSetupIntent.client_secret;
      confirmationType = 'setup';
    } else {
      clientSecret = invoice?.confirmation_secret?.client_secret;
      confirmationType = 'payment';
    }

    if (!clientSecret) {
      return NextResponse.json(
        { error: 'Failed to get client secret' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      confirmationType,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
