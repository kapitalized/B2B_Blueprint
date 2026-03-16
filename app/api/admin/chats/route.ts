/**
 * Admin: list chat threads with project, user, message count, context. Allowed: dashboard session OR Payload admin.
 * GET ?limit=100
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { chat_threads, chat_messages, project_main, user_profiles } from '@/lib/db/schema';
import { eq, desc, inArray, count } from 'drizzle-orm';

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
        contextSummary: chat_threads.contextSummary,
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

    const ids = rows.map((r) => r.id);
    let countByThread: Record<string, number> = {};
    if (ids.length > 0) {
      const counts = await db
        .select({
          threadId: chat_messages.threadId,
          count: count(),
        })
        .from(chat_messages)
        .where(inArray(chat_messages.threadId, ids))
        .groupBy(chat_messages.threadId);
      countByThread = Object.fromEntries(counts.map((c) => [c.threadId, c.count]));
    }

    const chats = rows.map((r) => ({
      id: r.id,
      title: r.title,
      contextSummary: r.contextSummary ?? null,
      lastActivity: r.lastActivity?.toISOString() ?? null,
      projectName: r.projectName ?? '—',
      projectShortId: r.projectShortId ?? null,
      userEmail: r.userEmail ?? '—',
      messageCount: countByThread[r.id] ?? 0,
    }));

    return NextResponse.json(chats);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load chats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
