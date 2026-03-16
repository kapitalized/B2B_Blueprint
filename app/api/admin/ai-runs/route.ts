/**
 * Admin: list AI analysis runs. Allowed: Payload admin or dashboard session.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { ai_analyses, project_main } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 100, 500);

  try {
    const rows = await db
      .select({
        id: ai_analyses.id,
        projectId: ai_analyses.projectId,
        analysisType: ai_analyses.analysisType,
        createdAt: ai_analyses.createdAt,
        runDurationMs: ai_analyses.runDurationMs,
        runStartedAt: ai_analyses.runStartedAt,
        projectName: project_main.projectName,
        projectShortId: project_main.shortId,
      })
      .from(ai_analyses)
      .leftJoin(project_main, eq(ai_analyses.projectId, project_main.id))
      .orderBy(desc(ai_analyses.createdAt))
      .limit(limit);

    const list = rows.map((r) => ({
      id: r.id,
      projectId: r.projectId ?? null,
      projectName: r.projectName ?? null,
      projectShortId: r.projectShortId ?? null,
      analysisType: r.analysisType,
      createdAt: r.createdAt?.toISOString() ?? null,
      runDurationMs: r.runDurationMs ?? null,
      runStartedAt: r.runStartedAt?.toISOString() ?? null,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/ai-runs]', e);
    return NextResponse.json({ error: 'Failed to load AI runs' }, { status: 500 });
  }
}
