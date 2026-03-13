/**
 * Get (GET) and update (PATCH) a single project. User must own the project.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { slugify } from '@/lib/project-url';
import { canAccessProject } from '@/lib/org';
import { formatAddress, type Address } from '@/lib/address';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const [row] = await db
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
      status: project_main.status,
      createdAt: project_main.createdAt,
      updatedAt: project_main.updatedAt,
    })
    .from(project_main)
    .where(eq(project_main.id, projectId));
  if (!row) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  let numberOfLevels = 1;
  try {
    const [levelRow] = await db
      .select({ numberOfLevels: project_main.numberOfLevels })
      .from(project_main)
      .where(eq(project_main.id, projectId))
      .limit(1);
    if (levelRow?.numberOfLevels != null && levelRow.numberOfLevels >= 1) numberOfLevels = levelRow.numberOfLevels;
  } catch {
    // number_of_levels column may not exist
  }
  const address: Address = {
    line1: row.addressLine1 ?? '',
    line2: row.addressLine2 ?? '',
    postcode: row.addressPostcode ?? '',
    stateProvince: row.addressStateProvince ?? '',
    country: row.addressCountry ?? '',
  };
  const projectAddress = (formatAddress(address) || row.projectAddress) ?? null;
  return NextResponse.json({
    ...row,
    numberOfLevels,
    projectAddress,
    address,
    country: row.addressCountry ?? row.country,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.projectName === 'string' && body.projectName.trim()) {
    updates.projectName = body.projectName.trim();
    updates.slug = slugify(body.projectName.trim()) || null;
  }
  if (typeof body.projectAddress === 'string') updates.projectAddress = body.projectAddress.trim() || null;
  if (body.address && typeof body.address === 'object') {
    const a = body.address as Record<string, unknown>;
    updates.addressLine1 = typeof a.line1 === 'string' ? a.line1.trim() || null : null;
    updates.addressLine2 = typeof a.line2 === 'string' ? a.line2.trim() || null : null;
    updates.addressPostcode = typeof a.postcode === 'string' ? a.postcode.trim() || null : null;
    updates.addressStateProvince = typeof a.stateProvince === 'string' ? a.stateProvince.trim() || null : null;
    updates.addressCountry = typeof a.country === 'string' ? a.country.trim() || null : null;
    updates.projectAddress = formatAddress({
      line1: (updates.addressLine1 as string) ?? '',
      line2: (updates.addressLine2 as string) ?? '',
      postcode: (updates.addressPostcode as string) ?? '',
      stateProvince: (updates.addressStateProvince as string) ?? '',
      country: (updates.addressCountry as string) ?? '',
    }) || null;
    updates.country = updates.addressCountry;
  }
  if (typeof body.projectDescription === 'string') updates.projectDescription = body.projectDescription.trim().slice(0, 500) || null;
  if (typeof body.projectObjectives === 'string') updates.projectObjectives = body.projectObjectives.trim().slice(0, 2000) || null;
  if (typeof body.country === 'string') updates.country = body.country.trim() || null;
  if (typeof body.projectStatus === 'string') updates.projectStatus = body.projectStatus.trim() || null;
  if (typeof body.numberOfLevels === 'number' && body.numberOfLevels >= 1 && body.numberOfLevels <= 20) {
    updates.numberOfLevels = body.numberOfLevels;
  }
  if (Object.keys(updates).length === 0) {
    const [project] = await db.select().from(project_main).where(eq(project_main.id, projectId));
    return NextResponse.json(project ?? {});
  }
  const [updated] = await db
    .update(project_main)
    .set({ ...updates, updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(project_main.id, projectId))
    .returning();
  return NextResponse.json(updated ?? {});
}
