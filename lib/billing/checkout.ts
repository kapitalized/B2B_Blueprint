/**
 * Create Stripe Checkout session for subscription. Org-scoped; metadata includes orgId.
 */

import { getStripe } from './stripe-client';
import type { PlanTier } from './config';
import { getStripePriceId } from './config';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

export async function createCheckoutSession(params: {
  orgId: string;
  tier: PlanTier;
  customerEmail: string;
}): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: 'Billing is not configured.' };

  const priceId = getStripePriceId(params.tier);
  if (!priceId) return { error: `Price ID for plan "${params.tier}" is not configured.` };

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    allow_promotion_codes: true,
    success_url: `${baseUrl || 'http://localhost:3000'}/dashboard/billing/confirmation`,
    cancel_url: `${baseUrl || 'http://localhost:3000'}/dashboard/billing?canceled=true`,
    customer_email: params.customerEmail,
    metadata: { orgId: params.orgId, planTier: params.tier },
    subscription_data: {
      metadata: { orgId: params.orgId, planTier: params.tier },
    },
  });

  const url = session.url ?? null;
  if (!url) return { error: 'Failed to create checkout session.' };
  return { url };
}
