/**
 * Admin: list, create, delete Stripe coupons. Allowed: Payload admin or dashboard session.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon, createPromotionCode } from '@/lib/billing';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const coupons = await listCoupons(100);
    return NextResponse.json(coupons);
  } catch (e) {
    console.error('[admin/coupons GET]', e);
    return NextResponse.json({ error: 'Failed to list coupons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    id?: string;
    name?: string;
    percentOff?: number;
    amountOff?: number;
    currency?: string;
    duration?: string;
    durationInMonths?: number;
    promotionCode?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const duration = body.duration === 'repeating' ? 'repeating' : body.duration === 'forever' ? 'forever' : 'once';
  try {
    const coupon = await createCoupon({
      id: body.id,
      name: body.name,
      percentOff: body.percentOff,
      amountOff: body.amountOff,
      currency: body.currency ?? 'usd',
      duration,
      durationInMonths: body.durationInMonths,
    });
    let promotionCode: { id: string; code: string } | undefined;
    if (typeof body.promotionCode === 'string' && body.promotionCode.trim()) {
      try {
        promotionCode = await createPromotionCode(coupon.id, body.promotionCode.trim());
      } catch (promoErr) {
        console.error('[admin/coupons POST promotionCode]', promoErr);
        return NextResponse.json({
          coupon,
          error: 'Coupon created but promotion code failed: ' + (promoErr instanceof Error ? promoErr.message : String(promoErr)),
        }, { status: 200 });
      }
    }
    return NextResponse.json(promotionCode ? { ...coupon, promotionCode } : coupon);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create coupon';
    console.error('[admin/coupons POST]', e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: string; name?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const coupon = await updateCoupon(id, { name: body.name });
    return NextResponse.json(coupon);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update coupon';
    console.error('[admin/coupons PATCH]', e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id?.trim()) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await deleteCoupon(id.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/coupons DELETE]', e);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
