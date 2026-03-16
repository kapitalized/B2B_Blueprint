/**
 * Stripe coupons: list, create, delete. For admin coupon settings.
 */

import { getStripe } from './stripe-client';

export interface CouponRow {
  id: string;
  name: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  valid: boolean;
  timesRedeemed: number;
}

export async function listCoupons(limit = 100): Promise<CouponRow[]> {
  const stripe = getStripe();
  if (!stripe) return [];

  const res = await stripe.coupons.list({ limit });
  return res.data.map((c) => ({
    id: c.id,
    name: c.name ?? null,
    percentOff: c.percent_off ?? null,
    amountOff: c.amount_off ?? null,
    currency: c.currency ?? null,
    duration: c.duration ?? 'once',
    durationInMonths: c.duration_in_months ?? null,
    valid: c.valid ?? true,
    timesRedeemed: c.times_redeemed ?? 0,
  }));
}

export interface CreateCouponParams {
  /** Optional custom ID (e.g. SAVE20). Auto-generated if omitted. */
  id?: string;
  name?: string;
  /** Percent off 0–100. Use this OR amountOff, not both. */
  percentOff?: number;
  /** Amount off in cents. Requires currency. */
  amountOff?: number;
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
}

export async function createCoupon(params: CreateCouponParams): Promise<CouponRow> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  const create: Parameters<typeof stripe.coupons.create>[0] = {
    duration: params.duration,
  };
  if (params.id?.trim()) create.id = params.id.trim();
  if (params.name?.trim()) create.name = params.name.trim();
  if (params.percentOff != null && params.percentOff >= 0 && params.percentOff <= 100) {
    create.percent_off = params.percentOff;
  } else if (params.amountOff != null && params.amountOff > 0) {
    create.amount_off = Math.round(params.amountOff);
    create.currency = (params.currency ?? 'usd').toLowerCase();
  } else {
    throw new Error('Provide either percentOff (0–100) or amountOff (cents) with currency');
  }
  if (params.duration === 'repeating' && params.durationInMonths != null) {
    create.duration_in_months = params.durationInMonths;
  }

  const c = await stripe.coupons.create(create);
  return {
    id: c.id,
    name: c.name ?? null,
    percentOff: c.percent_off ?? null,
    amountOff: c.amount_off ?? null,
    currency: c.currency ?? null,
    duration: c.duration ?? 'once',
    durationInMonths: c.duration_in_months ?? null,
    valid: c.valid ?? true,
    timesRedeemed: c.times_redeemed ?? 0,
  };
}

export async function updateCoupon(couponId: string, params: { name?: string }): Promise<CouponRow> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');
  const c = await stripe.coupons.update(couponId, { name: params.name ?? undefined });
  return {
    id: c.id,
    name: c.name ?? null,
    percentOff: c.percent_off ?? null,
    amountOff: c.amount_off ?? null,
    currency: c.currency ?? null,
    duration: c.duration ?? 'once',
    durationInMonths: c.duration_in_months ?? null,
    valid: c.valid ?? true,
    timesRedeemed: c.times_redeemed ?? 0,
  };
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');
  await stripe.coupons.del(couponId);
}

/**
 * Create a promotion code linked to a coupon. This is the code customers enter at checkout.
 */
export async function createPromotionCode(couponId: string, code: string): Promise<{ id: string; code: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');
  const sanitized = code.trim().toUpperCase().replace(/\s+/g, '_');
  if (!sanitized) throw new Error('Promotion code is required');
  const promo = await stripe.promotionCodes.create({
    coupon: couponId,
    code: sanitized,
  });
  return { id: promo.id, code: promo.code ?? sanitized };
}
