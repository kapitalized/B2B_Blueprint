/**
 * List (GET) and send (POST) messages in a chat thread. POST runs RAG over project analyses then LLM.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { chat_threads, chat_messages, project_files, project_main, ai_analyses, report_generated } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { callOpenRouter, callOpenRouterStream, isOpenRouterConfigured } from '@/lib/ai/openrouter';
import { getAIModelConfig } from '@/lib/ai/model-config';
import { parseCitationsFromContent } from '@/lib/ai/parse-citations';
import { transformOpenRouterStreamToSSE } from '@/lib/ai/stream-sse';
import { searchKnowledgeNodes } from '@/lib/ai/knowledge-nodes';
import { canAccessProject } from '@/lib/org';
import { writeLogAiRun } from '@/lib/ai/logs';

async function ensureThreadAccess(threadId: string, userId: string): Promise<{ thread: { id: string; projectId: string } } | null> {
  const [thread] = await db
    .select({ id: chat_threads.id, projectId: chat_threads.projectId })
    .from(chat_threads)
    .where(eq(chat_threads.id, threadId));
  if (!thread?.projectId) return null;
  const ok = await canAccessProject(thread.projectId, userId);
  return ok ? { thread: { id: thread.id, projectId: thread.projectId } } : null;
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
  const rateLimitRes = rateLimit(session.userId, 'chat', 30);
  if (rateLimitRes) return rateLimitRes;
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });
  const reportId = typeof body.reportId === 'string' ? body.reportId.trim() || null : null;
  const fileIds = Array.isArray(body.fileIds) ? (body.fileIds as string[]).filter((id) => typeof id === 'string') : undefined;
  const reportIds = Array.isArray(body.reportIds) ? (body.reportIds as string[]).filter((id) => typeof id === 'string') : undefined;

  const projectId = access.thread.projectId;
  const [project] = await db
    .select({
      projectName: project_main.projectName,
      projectDescription: project_main.projectDescription,
      projectObjectives: project_main.projectObjectives,
    })
    .from(project_main)
    .where(eq(project_main.id, projectId));
  let files = await db
    .select({ id: project_files.id, fileName: project_files.fileName, fileType: project_files.fileType })
    .from(project_files)
    .where(eq(project_files.projectId, projectId));
  if (fileIds?.length) {
    const idSet = new Set(fileIds);
    files = files.filter((f) => idSet.has(f.id));
  }

  const refLines: string[] = [];
  refLines.push(`Project: ${project?.projectName ?? 'Unnamed'}`);
  if (project?.projectDescription) refLines.push(`Description: ${project.projectDescription}`);
  if (project?.projectObjectives) refLines.push(`Objectives: ${project.projectObjectives}`);
  if (files.length > 0) {
    refLines.push('Uploaded documents (for citations use these file ids): ' + files.map((f) => `${f.fileName}=${f.id}`).join(', '));
  } else {
    refLines.push('Uploaded documents: none yet.');
  }

  if (reportIds?.length) {
    const reportsRows = await db
      .select({
        id: report_generated.id,
        reportTitle: report_generated.reportTitle,
        content: report_generated.content,
        analysisSourceId: report_generated.analysisSourceId,
      })
      .from(report_generated)
      .where(eq(report_generated.projectId, projectId));
    const reportIdSet = new Set(reportIds);
    const selectedReports = reportsRows.filter((r) => reportIdSet.has(r.id));
    const analysisIds = selectedReports.map((r) => r.analysisSourceId).filter(Boolean) as string[];
    let analyses: { id: string; analysisResult: unknown }[] = [];
    if (analysisIds.length > 0) {
      analyses = await db
        .select({ id: ai_analyses.id, analysisResult: ai_analyses.analysisResult })
        .from(ai_analyses)
        .where(eq(ai_analyses.projectId, projectId));
      const analysisIdSet = new Set(analysisIds);
      analyses = analyses.filter((a) => analysisIdSet.has(a.id));
    }
    const analysisParts = analyses.map((a) => {
      const r = a.analysisResult as { items?: Array<{ label?: string; value?: number; unit?: string }>; synthesis?: { content_md?: string } };
      if (r?.synthesis?.content_md) return r.synthesis.content_md;
      if (Array.isArray(r?.items)) return r.items.map((i) => `${i.label}: ${i.value} ${i.unit ?? ''}`).join('\n');
      return JSON.stringify(r ?? {});
    });
    for (const report of selectedReports) {
      let block = `\n---\nReport: ${report.reportTitle}\n`;
      if (report.content) block += `${report.content}\n`;
      const analysis = analyses.find((a) => a.id === report.analysisSourceId);
      if (analysis?.analysisResult) {
        const result = analysis.analysisResult as { items?: Array<{ label?: string; value?: number; unit?: string }> };
        const items = result?.items ?? [];
        if (items.length > 0) {
          block += 'Quantities: ' + items.map((i) => `${i.label ?? ''} ${i.value ?? ''} ${i.unit ?? ''}`).join('; ') + '\n';
        }
      }
      refLines.push(block);
    }
    if (analyses.length > 0) {
      refLines.push('Reports and analyses (for citations use these analysis ids): ' + analyses.map((a) => a.id).join(', '));
    }
  } else {
    const analyses = await db
      .select({ id: ai_analyses.id, analysisResult: ai_analyses.analysisResult })
      .from(ai_analyses)
      .where(eq(ai_analyses.projectId, projectId))
      .orderBy(desc(ai_analyses.createdAt))
      .limit(10);
    const analysisParts = analyses.map((a) => {
      const r = a.analysisResult as { items?: Array<{ label?: string; value?: number; unit?: string }>; synthesis?: { content_md?: string } };
      if (r?.synthesis?.content_md) return r.synthesis.content_md;
      if (Array.isArray(r?.items)) return r.items.map((i) => `${i.label}: ${i.value} ${i.unit ?? ''}`).join('\n');
      return JSON.stringify(r ?? {});
    });
    if (analysisParts.length > 0) {
      refLines.push('Reports and analyses (for citations use these analysis ids): ' + analyses.map((a) => a.id).join(', '));
      refLines.push('Content:');
      refLines.push(analysisParts.join('\n\n'));
    } else {
      refLines.push('Reports and analyses: none yet.');
    }
  }

  try {
    const ragHits = await searchKnowledgeNodes(projectId, content, 8);
    if (ragHits.length > 0) {
      refLines.push('Relevant excerpts from project documents (semantic search):');
      refLines.push(ragHits.map((h) => h.content).join('\n\n'));
    }
  } catch {
    // ignore RAG search failure
  }
  if (reportId) {
    const [report] = await db
      .select({
        reportTitle: report_generated.reportTitle,
        content: report_generated.content,
        projectId: report_generated.projectId,
        analysisSourceId: report_generated.analysisSourceId,
      })
      .from(report_generated)
      .where(eq(report_generated.id, reportId));
    if (report?.projectId === projectId) {
      let reportBlock = `\n\n---\nReport selected for refinement (user may ask you to fix or correct this):\nTitle: ${report.reportTitle}\n\n`;
      if (report.content) reportBlock += `Content:\n${report.content}\n\n`;
      if (report.analysisSourceId) {
        const [analysis] = await db
          .select({ analysisResult: ai_analyses.analysisResult })
          .from(ai_analyses)
          .where(eq(ai_analyses.id, report.analysisSourceId));
        const result = analysis?.analysisResult as { items?: Array<{ label?: string; value?: number; unit?: string }> } | undefined;
        const items = result?.items ?? [];
        if (items.length > 0) {
          reportBlock += 'Quantities table (label | value | unit):\n';
          items.forEach((i) => { reportBlock += `${i.label ?? ''}\t${i.value ?? ''}\t${i.unit ?? ''}\n`; });
        }
      }
      refLines.push(reportBlock);
    }
  }
  let ragContext = `Reference — use this when answering:\n${refLines.join('\n')}`;
  const maxRefChars = 14_000;
  if (ragContext.length > maxRefChars) {
    ragContext = ragContext.slice(0, maxRefChars) + '\n\n[Reference truncated for length.]';
  }

  const existing = await db
    .select({ role: chat_messages.role, content: chat_messages.content })
    .from(chat_messages)
    .where(eq(chat_messages.threadId, threadId))
    .orderBy(chat_messages.createdAt);
  await db.insert(chat_messages).values({ threadId, role: 'user', content });
  await db.update(chat_threads).set({ lastActivity: new Date() }).where(eq(chat_threads.id, threadId));

  const url = new URL(req.url);
  const wantStream = url.searchParams.get('stream') === '1' || req.headers.get('accept')?.includes('text/event-stream');
  const systemContent = `You are a helpful assistant for a construction/estimation app. Answer using only the following reference (uploaded docs, reports, and the user's messages). If something is not in the reference, say so.
When the user has selected a report for refinement, they may ask you to fix errors (e.g. missing areas, wrong numbers). Provide a corrected version: give the full revised Markdown report or quantities table they can copy and use. Use the same format as the original (Markdown table with columns like Item, Value, Unit).
When you cite a measurement or fact from a specific file or analysis, add at the very end of your message a single new line containing only this JSON (no other text on that line): {"citations": [{"type": "file", "id": "<file_uuid>"}]} or {"citations": [{"type": "analysis", "id": "<analysis_uuid>"}]}. Use the file and analysis ids listed in the reference. You may include multiple citations. Only add this line when you actually cite something.\n\n${ragContext}`;
  const messagesForLLM = [
    { role: 'system' as const, content: systemContent },
    ...existing.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content },
  ];

  if (wantStream && isOpenRouterConfigured()) {
    try {
      const modelConfig = await getAIModelConfig();
      const model = modelConfig.chat?.trim() || 'openai/gpt-4o-mini';
      const stream = await callOpenRouterStream({ model, messages: messagesForLLM, max_tokens: 1024 });
      if (stream) {
        const outStream = transformOpenRouterStreamToSSE(stream, (fullContent) => {
          const { content: contentForDisplay, citations } = parseCitationsFromContent(fullContent);
          db.insert(chat_messages)
            .values({
              threadId,
              role: 'assistant',
              content: contentForDisplay,
              citations: citations?.length ? (citations as unknown as Record<string, unknown>[]) : null,
            })
            .then(() => db.update(chat_threads).set({ lastActivity: new Date() }).where(eq(chat_threads.id, threadId)))
            .catch((err) => console.error('[Chat stream] persist error:', err));
        });
        return new Response(outStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-store',
            Connection: 'keep-alive',
          },
        });
      }
    } catch (err) {
      console.error('[Chat] stream error:', err);
      // fall through to non-stream response
    }
  }

  let assistantContent: string;
  if (isOpenRouterConfigured()) {
    try {
      const modelConfig = await getAIModelConfig();
      const model = modelConfig.chat?.trim() || 'openai/gpt-4o-mini';
      const result = await callOpenRouter({
        model,
        messages: messagesForLLM,
        max_tokens: 1024,
      });
      assistantContent = result.content;
      if (result.usage) {
        const u = result.usage;
        writeLogAiRun({
          eventType: 'chat_turn',
          projectId,
          userId: session.userId,
          provider: 'openrouter',
          model,
          inputTokens: u.prompt_tokens,
          outputTokens: u.completion_tokens,
          totalTokens: u.total_tokens,
          cost: u.cost,
          metadata: { threadId },
        }).catch((err) => console.error('[Chat] writeLogAiRun:', err));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Chat] OpenRouter error:', message);
      if (message.includes('401') || message.includes('Unauthorized')) {
        assistantContent = 'API key invalid or missing. Check OPENROUTER_API_KEY in .env.local.';
      } else if (message.includes('429')) {
        assistantContent = 'Rate limit reached. Please try again in a moment.';
      } else if (message.includes('context') || message.includes('token') || message.includes('413')) {
        assistantContent = 'Reference content is too long. Try with fewer reports or a shorter question.';
      } else {
        assistantContent = `Sorry, I could not generate a response. (${message.slice(0, 120)}${message.length > 120 ? '…' : ''})`;
      }
    }
  } else {
    assistantContent = 'Chat is available when OPENROUTER_API_KEY is set. Use project Reports for analysis results.';
  }

  const { content: contentForDisplay, citations } = parseCitationsFromContent(assistantContent);
  const [assistantMsg] = await db
    .insert(chat_messages)
    .values({
      threadId,
      role: 'assistant',
      content: contentForDisplay,
      citations: citations?.length ? (citations as unknown as Record<string, unknown>[]) : null,
    })
    .returning();
  await db.update(chat_threads).set({ lastActivity: new Date() }).where(eq(chat_threads.id, threadId));

  return NextResponse.json(assistantMsg);
}
