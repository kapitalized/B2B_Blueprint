/**
 * Admin: list orgs with billing/subscription info. Allowed: Payload admin or dashboard session.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { org_organisations } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 100, 500);

  try {
    const rows = await db
      .select({
        id: org_organisations.id,
        name: org_organisations.name,
        slug: org_organisations.slug,
        planStatus: org_organisations.planStatus,
        planTier: org_organisations.planTier,
        stripeCustomerId: org_organisations.stripeCustomerId,
        stripeSubscriptionId: org_organisations.stripeSubscriptionId,
        updatedAt: org_organisations.updatedAt,
      })
      .from(org_organisations)
      .orderBy(desc(org_organisations.updatedAt))
      .limit(limit);

    const list = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      planStatus: r.planStatus ?? null,
      planTier: r.planTier ?? null,
      stripeCustomerId: r.stripeCustomerId ?? null,
      stripeSubscriptionId: r.stripeSubscriptionId ?? null,
      updatedAt: r.updatedAt?.toISOString() ?? null,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/billing]', e);
    return NextResponse.json({ error: 'Failed to load billing' }, { status: 500 });
  }
}
