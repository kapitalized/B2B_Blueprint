/**
 * Admin: get one project, update (PATCH), or delete (DELETE). Allowed: Payload admin or dashboard session.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { project_main, user_profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    const [row] = await db
      .select({
        id: project_main.id,
        projectName: project_main.projectName,
        projectAddress: project_main.projectAddress,
        addressLine1: project_main.addressLine1,
        addressLine2: project_main.addressLine2,
        shortId: project_main.shortId,
        slug: project_main.slug,
        status: project_main.status,
        createdAt: project_main.createdAt,
        userEmail: user_profiles.email,
      })
      .from(project_main)
      .leftJoin(user_profiles, eq(project_main.userId, user_profiles.id))
      .where(eq(project_main.id, id))
      .limit(1);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      ...row,
      createdAt: row.createdAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error('[admin/projects GET]', e);
    return NextResponse.json({ error: 'Failed to load project' }, { status: 500 });
  }
}

const ALLOWED_KEYS = ['projectName', 'projectAddress', 'addressLine1', 'addressLine2', 'slug', 'status'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const data: Record<string, string | null> = {};
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      const v = body[key];
      data[key] = v === null || v === '' ? null : String(v);
    }
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  try {
    const [updated] = await db
      .update(project_main)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(project_main.id, id))
      .returning({
        id: project_main.id,
        projectName: project_main.projectName,
        shortId: project_main.shortId,
        slug: project_main.slug,
        status: project_main.status,
      });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[admin/projects PATCH]', e);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    const [deleted] = await db.delete(project_main).where(eq(project_main.id, id)).returning({ id: project_main.id });
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/projects DELETE]', e);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
