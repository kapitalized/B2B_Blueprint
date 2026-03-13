/**
 * Stripe webhook: verify signature, update org_organisations on checkout.session.completed.
 * Use raw body: do not parse JSON before verify. Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
import { headers } from 'next/headers';
import { getStripe } from '@/lib/billing';
import { db } from '@/lib/db';
import { org_organisations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret?.startsWith('whsec_')) {
    return new Response('Webhook not configured', { status: 500 });
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('Stripe-Signature');
  if (!signature) return new Response('Missing Stripe-Signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orgId = session.metadata?.orgId;
    const planTier = (session.metadata?.planTier as string) ?? 'pro';

    if (!orgId) {
      console.warn('[stripe webhook] checkout.session.completed missing metadata.orgId');
      return new Response(null, { status: 200 });
    }

    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

    if (stripeCustomerId || stripeSubscriptionId) {
      await db
        .update(org_organisations)
        .set({
          stripeCustomerId: stripeCustomerId ?? undefined,
          stripeSubscriptionId: stripeSubscriptionId ?? undefined,
          planStatus: 'active',
          planTier: planTier === 'starter' || planTier === 'pro' ? planTier : 'pro',
        })
        .where(eq(org_organisations.id, orgId));
    }
  }

  return new Response(null, { status: 200 });
}
