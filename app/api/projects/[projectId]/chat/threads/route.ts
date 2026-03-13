/**
 * List (GET) and create (POST) chat threads for a project.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main, chat_threads } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';

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
  try {
    const threads = await db
      .select()
      .from(chat_threads)
      .where(eq(chat_threads.projectId, projectId))
      .orderBy(desc(chat_threads.lastActivity));
    return NextResponse.json(threads);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list threads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'New chat';
    const [thread] = await db
      .insert(chat_threads)
      .values({
        projectId,
        userId: session.userId,
        title,
      })
      .returning();
    return NextResponse.json(thread);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create thread';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
