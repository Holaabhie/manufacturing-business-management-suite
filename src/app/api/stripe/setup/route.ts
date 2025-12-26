import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const products = await stripe.products.list({ active: true });
    let proProduct = products.data.find(p => p.name === 'IND Manager Pro');

    if (!proProduct) {
      proProduct = await stripe.products.create({
        name: 'IND Manager Pro',
        description: 'Unlock unlimited inventory, orders, analytics, and team features for your business.',
      });
    }

    const prices = await stripe.prices.list({ product: proProduct.id, active: true });
    let proPrice = prices.data.find(p => p.unit_amount === 999 && p.recurring?.interval === 'month');

    if (!proPrice) {
      proPrice = await stripe.prices.create({
        product: proProduct.id,
        unit_amount: 999,
        currency: 'inr',
        recurring: { interval: 'month' },
      });
    }

    return NextResponse.json({
      productId: proProduct.id,
      priceId: proPrice.id,
      message: 'Stripe products configured successfully',
    });
  } catch (error: any) {
    console.error('Error setting up Stripe:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup Stripe products' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const products = await stripe.products.list({ active: true });
    const proProduct = products.data.find(p => p.name === 'IND Manager Pro');

    if (!proProduct) {
      return NextResponse.json({ priceId: null });
    }

    const prices = await stripe.prices.list({ product: proProduct.id, active: true });
    const proPrice = prices.data.find(p => p.unit_amount === 999 && p.recurring?.interval === 'month');

    return NextResponse.json({
      priceId: proPrice?.id || null,
      productId: proProduct.id,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe setup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Stripe setup' },
      { status: 500 }
    );
  }
}
