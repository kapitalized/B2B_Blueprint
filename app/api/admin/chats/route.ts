/**
 * Admin: list chat threads with project and user. Allowed: dashboard session OR Payload admin.
 * GET ?limit=100
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { chat_threads, project_main, user_profiles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await getSessionForApi();
  if (!session && !(await isPayloadAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 100, 500);

  try {
    const rows = await db
      .select({
        id: chat_threads.id,
        title: chat_threads.title,
        lastActivity: chat_threads.lastActivity,
        projectName: project_main.projectName,
        projectShortId: project_main.shortId,
        userEmail: user_profiles.email,
      })
      .from(chat_threads)
      .leftJoin(project_main, eq(chat_threads.projectId, project_main.id))
      .leftJoin(user_profiles, eq(chat_threads.userId, user_profiles.id))
      .orderBy(desc(chat_threads.lastActivity), desc(chat_threads.id))
      .limit(limit);

    const chats = rows.map((r) => ({
      id: r.id,
      title: r.title,
      lastActivity: r.lastActivity?.toISOString() ?? null,
      projectName: r.projectName ?? '—',
      projectShortId: r.projectShortId ?? null,
      userEmail: r.userEmail ?? '—',
    }));

    return NextResponse.json(chats);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load chats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
