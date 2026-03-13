/**
 * Fetch org billing state from DB for dashboard display.
 */

import { db } from '@/lib/db';
import { org_organisations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface OrgBillingStatus {
  planStatus: string | null;
  planTier: string | null;
  stripeCustomerId: string | null;
  hasActiveSubscription: boolean;
}

export async function getOrgBillingStatus(orgId: string): Promise<OrgBillingStatus | null> {
  const [row] = await db
    .select({
      planStatus: org_organisations.planStatus,
      planTier: org_organisations.planTier,
      stripeCustomerId: org_organisations.stripeCustomerId,
      stripeSubscriptionId: org_organisations.stripeSubscriptionId,
    })
    .from(org_organisations)
    .where(eq(org_organisations.id, orgId))
    .limit(1);

  if (!row) return null;

  return {
    planStatus: row.planStatus ?? null,
    planTier: row.planTier ?? null,
    stripeCustomerId: row.stripeCustomerId ?? null,
    hasActiveSubscription: row.planStatus === 'active' && !!row.stripeSubscriptionId,
  };
}
