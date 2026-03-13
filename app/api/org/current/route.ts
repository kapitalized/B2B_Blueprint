/**
 * GET: current user's default org (for Organisation page).
 * PATCH: update org name, fullAddress (owner/admin).
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { ensureUserProfile } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { org_organisations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDefaultOrgId, canManageOrg } from '@/lib/org';
import { slugify } from '@/lib/project-url';
import { formatAddress, parseAddress, type Address } from '@/lib/address';

const ORG_CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
function randomOrgCode(length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += ORG_CODE_CHARS[Math.floor(Math.random() * ORG_CODE_CHARS.length)];
  return s;
}

export async function GET() {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureUserProfile(session);
    const orgId = await getDefaultOrgId(session.userId);
    let row: {
      id: string; name: string; slug: string; fullAddress: string | null;
      addressLine1?: string | null; addressLine2?: string | null; addressPostcode?: string | null;
      addressStateProvince?: string | null; addressCountry?: string | null;
      type: string; createdAt: Date | null;
    };
    try {
      const [r] = await db
        .select({
          id: org_organisations.id,
          name: org_organisations.name,
          slug: org_organisations.slug,
          fullAddress: org_organisations.fullAddress,
          addressLine1: org_organisations.addressLine1,
          addressLine2: org_organisations.addressLine2,
          addressPostcode: org_organisations.addressPostcode,
          addressStateProvince: org_organisations.addressStateProvince,
          addressCountry: org_organisations.addressCountry,
          type: org_organisations.type,
          createdAt: org_organisations.createdAt,
        })
        .from(org_organisations)
        .where(eq(org_organisations.id, orgId))
        .limit(1);
      if (!r) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
      row = r;
    } catch (colErr: unknown) {
      const msg = colErr instanceof Error ? colErr.message : String(colErr);
      if (msg.includes('address_line1') || msg.includes('address_line2')) {
        const [r] = await db
          .select({
            id: org_organisations.id,
            name: org_organisations.name,
            slug: org_organisations.slug,
            fullAddress: org_organisations.fullAddress,
            type: org_organisations.type,
            createdAt: org_organisations.createdAt,
          })
          .from(org_organisations)
          .where(eq(org_organisations.id, orgId))
          .limit(1);
        if (!r) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        row = { ...r, addressLine1: null, addressLine2: null, addressPostcode: null, addressStateProvince: null, addressCountry: null };
      } else {
        throw colErr;
      }
    }
    const address: Address = row.addressLine1 !== undefined
      ? {
          line1: row.addressLine1 ?? '',
          line2: row.addressLine2 ?? '',
          postcode: row.addressPostcode ?? '',
          stateProvince: row.addressStateProvince ?? '',
          country: row.addressCountry ?? '',
        }
      : parseAddress(row.fullAddress ?? '');
    const fullAddress = formatAddress(address) || (row.fullAddress ?? null);
    return NextResponse.json({
      id: row.id,
      name: row.name,
      slug: row.slug,
      fullAddress,
      address,
      type: row.type,
      createdAt: row.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load organisation';
    console.error('[api/org/current GET]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const orgId = await getDefaultOrgId(session.userId);
    const canEdit = await canManageOrg(session.userId, orgId);
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const updates: {
      name?: string; fullAddress?: string | null; slug?: string; updatedAt: Date;
      addressLine1?: string | null; addressLine2?: string | null; addressPostcode?: string | null;
      addressStateProvince?: string | null; addressCountry?: string | null;
    } = { updatedAt: new Date() };
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.fullAddress === 'string') updates.fullAddress = body.fullAddress.trim() || null;
    if (typeof body.slug === 'string' && body.slug.trim()) updates.slug = body.slug.trim();
    if (body.address && typeof body.address === 'object') {
      const a = body.address as Record<string, unknown>;
      updates.addressLine1 = typeof a.line1 === 'string' ? a.line1.trim() || null : null;
      updates.addressLine2 = typeof a.line2 === 'string' ? a.line2.trim() || null : null;
      updates.addressPostcode = typeof a.postcode === 'string' ? a.postcode.trim() || null : null;
      updates.addressStateProvince = typeof a.stateProvince === 'string' ? a.stateProvince.trim() || null : null;
      updates.addressCountry = typeof a.country === 'string' ? a.country.trim() || null : null;
      updates.fullAddress = formatAddress({
        line1: updates.addressLine1 ?? '',
        line2: updates.addressLine2 ?? '',
        postcode: updates.addressPostcode ?? '',
        stateProvince: updates.addressStateProvince ?? '',
        country: updates.addressCountry ?? '',
      }) || null;
    }
    if (body.regenerateSlug === true) {
      const [current] = await db.select({ name: org_organisations.name }).from(org_organisations).where(eq(org_organisations.id, orgId)).limit(1);
      const base = slugify(current?.name ?? 'org');
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = `${base}-${randomOrgCode(10)}`;
        const [existing] = await db.select({ id: org_organisations.id }).from(org_organisations).where(eq(org_organisations.slug, candidate)).limit(1);
        if (!existing || existing.id === orgId) {
          updates.slug = candidate;
          break;
        }
      }
      if (!updates.slug) updates.slug = `${base}-${randomOrgCode(10)}`;
    }
    if (Object.keys(updates).length === 1) {
      const [current] = await db.select().from(org_organisations).where(eq(org_organisations.id, orgId)).limit(1);
      return NextResponse.json(current ?? { error: 'Not found' }, { status: current ? 200 : 404 });
    }
    const [updated] = await db
      .update(org_organisations)
      .set(updates)
      .where(eq(org_organisations.id, orgId))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update organisation';
    console.error('[api/org/current PATCH]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
