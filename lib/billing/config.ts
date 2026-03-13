/**
 * Billing module: plan and price configuration.
 * Set STRIPE_PRICE_ID_STARTER and STRIPE_PRICE_ID_PRO in env (from Stripe Dashboard).
 */

export type PlanTier = 'starter' | 'pro';

export const PLAN_IDS = {
  starter: 'starter',
  pro: 'pro',
} as const;

/** Price IDs from env; create products in Stripe: Starter $50/mo, Pro $200/mo. */
export function getStripePriceId(tier: PlanTier): string | null {
  const key =
    tier === 'starter'
      ? process.env.STRIPE_PRICE_ID_STARTER
      : process.env.STRIPE_PRICE_ID_PRO;
  return key ?? null;
}

export const PLAN_DISPLAY: Record<PlanTier, { name: string; price: string; description: string }> = {
  starter: { name: 'Starter', price: '$50/mo', description: 'Essential tools for small teams.' },
  pro: { name: 'Pro', price: '$200/mo', description: 'Full features for growing organisations.' },
};
