/**
 * POST: create Stripe Checkout session for the current org. Owner only.
 * Body: { tier: 'starter' | 'pro' }
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { getDefaultOrgId, canManageBilling } from '@/lib/org';
import { createCheckoutSession } from '@/lib/billing';
import type { PlanTier } from '@/lib/billing';

export async function POST(req: Request) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getDefaultOrgId(session.userId);
  const canManage = await canManageBilling(session.userId, orgId);
  if (!canManage) return NextResponse.json({ error: 'Only the org owner can manage billing.' }, { status: 403 });

  let body: { tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tier = (body.tier === 'starter' || body.tier === 'pro' ? body.tier : 'starter') as PlanTier;
  const email = session.user?.email ?? '';
  if (!email) return NextResponse.json({ error: 'User email is required for checkout.' }, { status: 400 });

  const result = await createCheckoutSession({ orgId, tier, customerEmail: email });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ url: result.url });
}
