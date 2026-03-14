/**
 * Projects API: list (GET) and create (POST). Scoped to current user.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi, ensureUserProfile } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { eq, desc, or, inArray } from 'drizzle-orm';
import { generateShortId, slugify } from '@/lib/project-url';
import { getDefaultOrgId, getOrgIdsForUser } from '@/lib/org';
import { checkProjectLimit } from '@/lib/plan-limits';
import { formatAddress, type Address } from '@/lib/address';

export async function GET() {
  const session = await getSessionForApi();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    let orgIds: string[] = [];
    try {
      orgIds = await getOrgIdsForUser(session.userId);
    } catch {
      // org_members table may not exist yet; fall back to userId-only filter
    }
    type Row = {
      id: string;
      userId: string | null;
      orgId: string | null;
      projectName: string;
      projectAddress: string | null;
      projectDescription: string | null;
      projectObjectives: string | null;
      country: string | null;
      siteType: string | null;
      projectStatus: string | null;
      shortId: string | null;
      slug: string | null;
      numberOfLevels?: number | null;
      status: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      addressPostcode?: string | null;
      addressStateProvince?: string | null;
      addressCountry?: string | null;
    };
    let rows: Row[];
    try {
      rows = await db
        .select({
          id: project_main.id,
          userId: project_main.userId,
          orgId: project_main.orgId,
          projectName: project_main.projectName,
          projectAddress: project_main.projectAddress,
          addressLine1: project_main.addressLine1,
          addressLine2: project_main.addressLine2,
          addressPostcode: project_main.addressPostcode,
          addressStateProvince: project_main.addressStateProvince,
          addressCountry: project_main.addressCountry,
          projectDescription: project_main.projectDescription,
          projectObjectives: project_main.projectObjectives,
          country: project_main.country,
          siteType: project_main.siteType,
          projectStatus: project_main.projectStatus,
          shortId: project_main.shortId,
          slug: project_main.slug,
          numberOfLevels: project_main.numberOfLevels,
          status: project_main.status,
          createdAt: project_main.createdAt,
          updatedAt: project_main.updatedAt,
        })
        .from(project_main)
        .where(orgIds.length > 0 ? or(eq(project_main.userId, session.userId), inArray(project_main.orgId, orgIds)) : eq(project_main.userId, session.userId))
        .orderBy(desc(project_main.createdAt)) as Row[];
    } catch (colErr: unknown) {
      const msg = colErr instanceof Error ? colErr.message : String(colErr);
      const missingColumn = msg.includes('address_line1') || msg.includes('address_line2') || msg.includes('address_country') || msg.includes('site_type') || msg.includes('number_of_levels');
      if (missingColumn) {
        // Fallback: omit columns that may not exist (e.g. number_of_levels, org_id, address fields)
        rows = (await db
          .select({
            id: project_main.id,
            userId: project_main.userId,
            projectName: project_main.projectName,
            projectAddress: project_main.projectAddress,
            projectDescription: project_main.projectDescription,
            projectObjectives: project_main.projectObjectives,
            country: project_main.country,
            projectStatus: project_main.projectStatus,
            shortId: project_main.shortId,
            slug: project_main.slug,
            status: project_main.status,
            createdAt: project_main.createdAt,
            updatedAt: project_main.updatedAt,
          })
          .from(project_main)
          .where(eq(project_main.userId, session.userId))
          .orderBy(desc(project_main.createdAt))) as Row[];
      } else {
        throw colErr;
      }
    }
    const projects = rows.map((p) => {
      const address: Address = {
        line1: p.addressLine1 ?? '',
        line2: p.addressLine2 ?? '',
        postcode: p.addressPostcode ?? '',
        stateProvince: p.addressStateProvince ?? '',
        country: p.addressCountry ?? '',
      };
      const projectAddress = (formatAddress(address) || p.projectAddress) ?? null;
      return {
        id: p.id,
        userId: p.userId,
        orgId: p.orgId,
        projectName: p.projectName,
        projectAddress,
        address,
        projectDescription: p.projectDescription,
        projectObjectives: p.projectObjectives,
        country: (p.addressCountry ?? p.country) ?? null,
        siteType: p.siteType,
        projectStatus: p.projectStatus,
        shortId: p.shortId,
        slug: p.slug,
        numberOfLevels: p.numberOfLevels ?? 1,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
    return NextResponse.json(projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list projects';
    console.error('[api/projects GET]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionForApi();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { projectName, projectAddress, projectDescription, country, siteType, projectStatus, address, numberOfLevels: rawLevels } = body;
    if (!projectName || typeof projectName !== 'string' || !projectName.trim()) {
      return NextResponse.json({ error: 'projectName is required' }, { status: 400 });
    }
    await ensureUserProfile(session);
    const projectLimitError = await checkProjectLimit(session.userId);
    if (projectLimitError) {
      return NextResponse.json({ error: projectLimitError }, { status: 403 });
    }
    let orgId: string | undefined;
    try {
      orgId = await getDefaultOrgId(session.userId);
    } catch {
      orgId = undefined; // org tables or default_org_id may not exist
    }
    const name = projectName.trim();
    const slug = slugify(name);
    const a = address && typeof address === 'object' ? address as Record<string, unknown> : {};
    const addr = {
      line1: typeof a.line1 === 'string' ? a.line1.trim() || null : null,
      line2: typeof a.line2 === 'string' ? a.line2.trim() || null : null,
      postcode: typeof a.postcode === 'string' ? a.postcode.trim() || null : null,
      stateProvince: typeof a.stateProvince === 'string' ? a.stateProvince.trim() || null : null,
      country: typeof a.country === 'string' ? a.country.trim() || null : null,
    };
    const projectAddressStr = formatAddress({
      line1: addr.line1 ?? '',
      line2: addr.line2 ?? '',
      postcode: addr.postcode ?? '',
      stateProvince: addr.stateProvince ?? '',
      country: addr.country ?? '',
    }) || (typeof projectAddress === 'string' ? projectAddress.trim() || null : null);
    let shortId = generateShortId();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.select({ id: project_main.id }).from(project_main).where(eq(project_main.shortId, shortId)).limit(1);
      if (existing.length === 0) break;
      shortId = generateShortId();
    }
    const baseValues = {
      userId: session.userId,
      orgId: orgId ?? null,
      projectName: name,
      projectAddress: projectAddressStr,
      addressLine1: addr.line1,
      addressLine2: addr.line2,
      addressPostcode: addr.postcode,
      addressStateProvince: addr.stateProvince,
      addressCountry: addr.country,
      projectDescription: typeof projectDescription === 'string' ? projectDescription.trim().slice(0, 500) || null : null,
      country: addr.country ?? (typeof country === 'string' ? country.trim() || null : null),
      siteType: typeof siteType === 'string' ? siteType.trim() || null : null,
      projectStatus: typeof projectStatus === 'string' ? projectStatus.trim() || null : null,
      shortId,
      slug: slug || null,
      status: 'active',
    };
    const numberOfLevels = typeof rawLevels === 'number' && rawLevels >= 1 && rawLevels <= 20 ? rawLevels : 1;
    let project: (typeof project_main.$inferSelect) | undefined;
    try {
      [project] = await db.insert(project_main).values({ ...baseValues, numberOfLevels }).returning();
    } catch (colErr: unknown) {
      const msg = String(colErr instanceof Error ? colErr.message : (colErr as { message?: string })?.message ?? colErr);
      if (msg.includes('number_of_levels')) {
        [project] = await db.insert(project_main).values(baseValues).returning();
      } else {
        throw colErr;
      }
    }
    if (!project) {
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
    // Return a plain object so JSON serialization never fails (DB row may have non-serializable values)
    const response = {
      id: String(project.id),
      userId: project.userId ? String(project.userId) : null,
      orgId: project.orgId ? String(project.orgId) : null,
      projectName: String(project.projectName),
      projectAddress: project.projectAddress != null ? String(project.projectAddress) : null,
      projectDescription: project.projectDescription != null ? String(project.projectDescription) : null,
      projectObjectives: project.projectObjectives != null ? String(project.projectObjectives) : null,
      country: project.country != null ? String(project.country) : null,
      siteType: project.siteType != null ? String(project.siteType) : null,
      projectStatus: project.projectStatus != null ? String(project.projectStatus) : null,
      shortId: project.shortId != null ? String(project.shortId) : null,
      slug: project.slug != null ? String(project.slug) : null,
      status: project.status != null ? String(project.status) : 'active',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      numberOfLevels,
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
