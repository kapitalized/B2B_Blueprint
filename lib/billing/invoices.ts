/**
 * List Stripe invoices for a customer. Maps price IDs to plan names for display.
 */

import { getStripe } from './stripe-client';
import { getStripePriceId } from './config';
import type { PlanTier } from './config';

export interface BillingInvoice {
  id: string;
  number: string | null;
  status: string;
  amountPaid: number; // cents
  currency: string;
  created: number; // Unix timestamp
  planName: string; // "Starter" | "Pro" | description fallback
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
}

const PLAN_TIER_NAMES: Record<PlanTier, string> = {
  starter: 'Starter',
  pro: 'Pro',
};

function planNameForPriceId(priceId: string | null): string {
  if (!priceId) return 'Subscription';
  if (priceId === getStripePriceId('starter')) return PLAN_TIER_NAMES.starter;
  if (priceId === getStripePriceId('pro')) return PLAN_TIER_NAMES.pro;
  return 'Subscription';
}

/**
 * Fetch recent invoices for a Stripe customer. Returns list suitable for billing page.
 */
export async function listInvoicesForCustomer(
  customerId: string,
  limit = 24
): Promise<BillingInvoice[]> {
  const stripe = getStripe();
  if (!stripe) return [];

  const res = await stripe.invoices.list({
    customer: customerId,
    limit,
    status: 'paid',
    expand: ['data.lines.data.price'],
  });

  return res.data.map((inv) => {
    const firstLine = (inv.lines?.data?.[0] ?? null) as unknown as
      | { price?: { id?: string } | string | null }
      | null;
    const rawPrice = firstLine?.price;
    const priceId =
      rawPrice && typeof rawPrice === 'object'
        ? (rawPrice.id ?? null)
        : null;
    return {
      id: inv.id,
      number: inv.number ?? null,
      status: inv.status ?? 'unknown',
      amountPaid: inv.amount_paid ?? 0,
      currency: (inv.currency ?? 'usd').toUpperCase(),
      created: inv.created ?? 0,
      planName: planNameForPriceId(priceId),
      invoicePdf: inv.invoice_pdf ?? null,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    };
  });
}
