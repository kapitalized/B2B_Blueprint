/**
 * Trigger the 3-step AI pipeline (orchestrator) and persist to DB.
 * POST body: { projectId, fileId?, fileUrl?, taskId?, orgId?, sourceContent?, libraryContext?, benchmarks? }
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { runPipeline } from '@/lib/ai/orchestrator';
import { persistPipelineResult } from '@/lib/ai/persistence';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function ensureProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(and(eq(project_main.id, projectId), eq(project_main.userId, userId)));
  return !!row;
}

export async function POST(req: Request) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const {
      projectId,
      fileId,
      fileUrl,
      taskId = `task_${Date.now()}`,
      orgId = 'default',
      sourceContent,
      libraryContext,
      benchmarks,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }
    const ok = await ensureProjectOwnership(projectId, session.userId);
    if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const result = await runPipeline({
      taskId,
      orgId,
      fileUrl: fileUrl ?? undefined,
      sourceContent: sourceContent ?? 'Sample document content for extraction.',
      libraryContext: libraryContext ?? {},
      benchmarks: benchmarks ?? [],
    });

    const { digestId, analysisId, reportId } = await persistPipelineResult({
      projectId,
      fileId: fileId ?? null,
      result,
    });

    return NextResponse.json({
      ...result,
      persisted: { digestId, analysisId, reportId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline failed';
    console.error('[AI run]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
