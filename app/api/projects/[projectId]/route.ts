/**
 * Get (GET) and update (PATCH) a single project. User must own the project.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { slugify } from '@/lib/project-url';

async function ensureProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(and(eq(project_main.id, projectId), eq(project_main.userId, userId)));
  return !!row;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await ensureProjectOwnership(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const [project] = await db.select().from(project_main).where(eq(project_main.id, projectId));
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await ensureProjectOwnership(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.projectName === 'string' && body.projectName.trim()) {
    updates.projectName = body.projectName.trim();
    updates.slug = slugify(body.projectName.trim()) || null;
  }
  if (typeof body.projectAddress === 'string') updates.projectAddress = body.projectAddress.trim() || null;
  if (typeof body.projectDescription === 'string') updates.projectDescription = body.projectDescription.trim().slice(0, 500) || null;
  if (typeof body.projectObjectives === 'string') updates.projectObjectives = body.projectObjectives.trim().slice(0, 2000) || null;
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
