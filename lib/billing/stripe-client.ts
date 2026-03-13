/**
 * Stripe client singleton. Safe when STRIPE_SECRET_KEY is unset (returns null).
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_')) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  }
  return stripeInstance;
}

export function isBillingConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY?.startsWith('sk_') &&
    process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')
  );
}
