/**
 * Admin: list paid Stripe invoices. Allowed: Payload admin or dashboard session.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { listAllPaidInvoices } from '@/lib/billing/invoices';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 100, 100);

  try {
    const list = await listAllPaidInvoices(limit);
    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/billings]', e);
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
  }
}
