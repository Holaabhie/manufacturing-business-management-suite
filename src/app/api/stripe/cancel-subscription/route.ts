import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, cancelImmediately = false } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (cancelImmediately) {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: 'starter',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          subscription_current_period_end: null,
        })
        .eq('id', userId);
    } else {
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'canceling' })
        .eq('id', userId);
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
