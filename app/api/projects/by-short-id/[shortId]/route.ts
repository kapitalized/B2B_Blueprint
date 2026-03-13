/**
 * Resolve project by short ID for neat URLs. Returns project if session user owns it.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shortId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { shortId } = await params;
  if (!shortId) {
    return NextResponse.json({ error: 'shortId required' }, { status: 400 });
  }
  const [project] = await db.select().from(project_main).where(eq(project_main.shortId, shortId)).limit(1);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const ok = await canAccessProject(project.id, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json(project);
}
