/**
 * Create Stripe Customer Portal session for managing subscription (cancel, switch plan, payment method).
 */

import { getStripe } from './stripe-client';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl?: string;
}): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: 'Billing is not configured.' };

  const returnUrl = params.returnUrl ?? `${baseUrl || 'http://localhost:3000'}/dashboard/billing`;

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: returnUrl,
  });

  if (!session.url) return { error: 'Failed to create portal session.' };
  return { url: session.url };
}
