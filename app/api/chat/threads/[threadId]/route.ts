/**
 * PATCH: update thread (e.g. title). Used for renaming chat threads.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { chat_threads, project_main } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function ensureThreadAccess(threadId: string, userId: string): Promise<boolean> {
  const [thread] = await db
    .select({ id: chat_threads.id, projectId: chat_threads.projectId })
    .from(chat_threads)
    .where(eq(chat_threads.id, threadId));
  if (!thread?.projectId) return false;
  const [project] = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(and(eq(project_main.id, thread.projectId), eq(project_main.userId, userId)));
  return !!project;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { threadId } = await params;
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 });
  const ok = await ensureThreadAccess(threadId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;
    if (title === null) return NextResponse.json({ error: 'title required' }, { status: 400 });
    const [updated] = await db
      .update(chat_threads)
      .set({ title })
      .where(eq(chat_threads.id, threadId))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update thread';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
