/**
 * Admin: list Stripe products (subscription plans) and create/archive. Allowed: Payload admin only.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { getStripe } from '@/lib/billing';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  try {
    const products = await stripe.products.list({ active: true, limit: 100 });
    const withPrices = await Promise.all(
      products.data.map(async (p) => {
        const prices = await stripe.prices.list({ product: p.id, active: true });
        const defaultPrice = prices.data[0];
        return {
          id: p.id,
          name: p.name,
          description: p.description ?? '',
          defaultPriceId: defaultPrice?.id ?? null,
          defaultPriceUnitAmount: defaultPrice?.unit_amount ?? null,
          defaultPriceCurrency: defaultPrice?.currency ?? null,
          defaultPriceInterval: defaultPrice?.recurring?.interval ?? null,
        };
      })
    );
    return NextResponse.json(withPrices);
  } catch (e) {
    console.error('[admin/stripe-plans]', e);
    return NextResponse.json({ error: 'Failed to list Stripe products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  let body: { name: string; description?: string; unitAmount: number; currency?: string; interval?: 'month' | 'year' } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const unitAmount = Number(body.unitAmount);
  if (!Number.isFinite(unitAmount) || unitAmount < 0) return NextResponse.json({ error: 'unitAmount must be a non-negative number (cents)' }, { status: 400 });
  const currency = (typeof body.currency === 'string' ? body.currency : 'usd').toLowerCase();
  const interval = body.interval === 'year' ? 'year' : 'month';

  try {
    const product = await stripe.products.create({ name, description: body.description ?? undefined });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(unitAmount),
      currency,
      recurring: { interval },
    });
    return NextResponse.json({
      id: product.id,
      name: product.name,
      defaultPriceId: price.id,
      defaultPriceUnitAmount: price.unit_amount,
      defaultPriceCurrency: price.currency,
      defaultPriceInterval: interval,
    });
  } catch (e) {
    console.error('[admin/stripe-plans POST]', e);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  let body: { id?: string; name?: string; description?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id?.startsWith('prod_')) return NextResponse.json({ error: 'id must be a Stripe product ID (prod_...)' }, { status: 400 });

  try {
    await stripe.products.update(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
    });
    const product = await stripe.products.retrieve(id);
    const prices = await stripe.prices.list({ product: id, active: true });
    const defaultPrice = prices.data[0];
    return NextResponse.json({
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      defaultPriceId: defaultPrice?.id ?? null,
      defaultPriceUnitAmount: defaultPrice?.unit_amount ?? null,
      defaultPriceCurrency: defaultPrice?.currency ?? null,
      defaultPriceInterval: defaultPrice?.recurring?.interval ?? null,
    });
  } catch (e) {
    console.error('[admin/stripe-plans PATCH]', e);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id?.startsWith('prod_')) return NextResponse.json({ error: 'id must be a Stripe product ID (prod_...)' }, { status: 400 });

  try {
    await stripe.products.update(id, { active: false });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/stripe-plans DELETE]', e);
    return NextResponse.json({ error: 'Failed to archive plan' }, { status: 500 });
  }
}
