/**
 * List (GET) and send (POST) messages in a chat thread. POST runs RAG over project analyses then LLM.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { chat_threads, chat_messages, project_main, ai_analyses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { callOpenRouter, isOpenRouterConfigured } from '@/lib/ai/openrouter';

async function ensureThreadAccess(threadId: string, userId: string): Promise<{ thread: { id: string; projectId: string } } | null> {
  const [thread] = await db
    .select({ id: chat_threads.id, projectId: chat_threads.projectId })
    .from(chat_threads)
    .where(eq(chat_threads.id, threadId));
  if (!thread?.projectId) return null;
  const [project] = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(and(eq(project_main.id, thread.projectId), eq(project_main.userId, userId)));
  return project ? { thread: { id: thread.id, projectId: thread.projectId } } : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { threadId } = await params;
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 });
  const access = await ensureThreadAccess(threadId, session.userId);
  if (!access) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  const messages = await db
    .select()
    .from(chat_messages)
    .where(eq(chat_messages.threadId, threadId))
    .orderBy(chat_messages.createdAt);
  return NextResponse.json(messages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { threadId } = await params;
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 });
  const access = await ensureThreadAccess(threadId, session.userId);
  if (!access) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const projectId = access.thread.projectId;
  const analyses = await db
    .select({ analysisResult: ai_analyses.analysisResult })
    .from(ai_analyses)
    .where(eq(ai_analyses.projectId, projectId))
    .orderBy(desc(ai_analyses.createdAt))
    .limit(10);
  const contextParts = analyses.map((a) => {
    const r = a.analysisResult as { items?: Array<{ label?: string; value?: number; unit?: string }>; synthesis?: { content_md?: string } };
    if (r.synthesis?.content_md) return r.synthesis.content_md;
    if (Array.isArray(r.items)) return r.items.map((i) => `${i.label}: ${i.value} ${i.unit ?? ''}`).join('\n');
    return JSON.stringify(r);
  });
  const ragContext = contextParts.length > 0
    ? `Project context (recent analyses):\n${contextParts.join('\n\n')}`
    : 'No project analyses yet.';

  const existing = await db
    .select({ role: chat_messages.role, content: chat_messages.content })
    .from(chat_messages)
    .where(eq(chat_messages.threadId, threadId))
    .orderBy(chat_messages.createdAt);
  await db.insert(chat_messages).values({ threadId, role: 'user', content });
  await db.update(chat_threads).set({ lastActivity: new Date() }).where(eq(chat_threads.id, threadId));

  let assistantContent: string;
  if (isOpenRouterConfigured()) {
    try {
      const messages = [
        { role: 'system' as const, content: `You are a helpful assistant for a construction/estimation app. Use this context when relevant:\n${ragContext}` },
        ...existing.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content },
      ];
      assistantContent = await callOpenRouter({
        model: 'openai/gpt-4o-mini',
        messages,
        max_tokens: 1024,
      });
    } catch {
      assistantContent = 'Sorry, I could not generate a response. Please try again.';
    }
  } else {
    assistantContent = 'Chat is available when OPENROUTER_API_KEY is set. Use project Reports for analysis results.';
  }

  const [assistantMsg] = await db
    .insert(chat_messages)
    .values({ threadId, role: 'assistant', content: assistantContent })
    .returning();
  await db.update(chat_threads).set({ lastActivity: new Date() }).where(eq(chat_threads.id, threadId));

  return NextResponse.json(assistantMsg);
}
