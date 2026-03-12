/**
 * Resolve project by short ID for neat URLs. Returns project if session user owns it.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

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
  const [project] = await db
    .select()
    .from(project_main)
    .where(and(eq(project_main.shortId, shortId), eq(project_main.userId, session.userId)))
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  return NextResponse.json(project);
}
