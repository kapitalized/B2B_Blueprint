/**
 * Admin: create a promotion code for an existing coupon. Allowed: Payload admin or dashboard session.
 * POST body: { couponId: string, code: string }
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { createPromotionCode } from '@/lib/billing';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { couponId?: string; code?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const couponId = typeof body.couponId === 'string' ? body.couponId.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!couponId || !code) return NextResponse.json({ error: 'couponId and code required' }, { status: 400 });

  try {
    const result = await createPromotionCode(couponId, code);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create promotion code';
    console.error('[admin/coupons/promotion-code POST]', e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
