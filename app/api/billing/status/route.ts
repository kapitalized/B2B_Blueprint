/**
 * GET: current org billing status, invoices (when customer exists), and whether user can manage billing.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { getDefaultOrgId, canManageBilling } from '@/lib/org';
import { getOrgBillingStatus, listInvoicesForCustomer } from '@/lib/billing';

export async function GET() {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getDefaultOrgId(session.userId);
  const canManage = await canManageBilling(session.userId, orgId);
  const billing = await getOrgBillingStatus(orgId);

  let invoices: Awaited<ReturnType<typeof listInvoicesForCustomer>> = [];
  if (billing?.stripeCustomerId) {
    try {
      invoices = await listInvoicesForCustomer(billing.stripeCustomerId, 24);
    } catch {
      // Stripe or config error; return empty list
    }
  }

  return NextResponse.json({
    billing: billing ?? null,
    canManage,
    invoices,
  });
}
