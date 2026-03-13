/**
 * POST: create Stripe Customer Portal session for the current org. Owner only.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { getDefaultOrgId, canManageBilling } from '@/lib/org';
import { createBillingPortalSession, getOrgBillingStatus } from '@/lib/billing';

export async function POST() {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getDefaultOrgId(session.userId);
  const canManage = await canManageBilling(session.userId, orgId);
  if (!canManage) return NextResponse.json({ error: 'Only the org owner can manage billing.' }, { status: 403 });

  const billing = await getOrgBillingStatus(orgId);
  if (!billing?.stripeCustomerId) return NextResponse.json({ error: 'No billing customer found. Subscribe first.' }, { status: 400 });

  const result = await createBillingPortalSession({ customerId: billing.stripeCustomerId });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ url: result.url });
}
