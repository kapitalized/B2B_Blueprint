/**
 * Admin: list AI pipeline run logs with project, user, date, models, tokens.
 * Allowed: dashboard session OR Payload admin. GET ?limit=100
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { ai_analyses, project_main, user_profiles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await getSessionForApi();
  const payloadAdmin = await isPayloadAdmin(req);
  if (!session && !payloadAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

  try {
    const rows = await db
      .select({
        id: ai_analyses.id,
        projectId: ai_analyses.projectId,
        analysisType: ai_analyses.analysisType,
        runStartedAt: ai_analyses.runStartedAt,
        runDurationMs: ai_analyses.runDurationMs,
        inputSizeBytes: ai_analyses.inputSizeBytes,
        inputPageCount: ai_analyses.inputPageCount,
        tokenUsage: ai_analyses.tokenUsage,
        modelsUsed: ai_analyses.modelsUsed,
        createdAt: ai_analyses.createdAt,
        projectName: project_main.projectName,
        userEmail: user_profiles.email,
      })
      .from(ai_analyses)
      .leftJoin(project_main, eq(ai_analyses.projectId, project_main.id))
      .leftJoin(user_profiles, eq(project_main.userId, user_profiles.id))
      .orderBy(desc(ai_analyses.runStartedAt), desc(ai_analyses.createdAt))
      .limit(limit);

    const logs = rows.map((r) => ({
      id: r.id,
      projectName: r.projectName ?? '—',
      userEmail: r.userEmail ?? '—',
      analysisType: r.analysisType,
      runStartedAt: r.runStartedAt?.toISOString() ?? null,
      runDurationMs: r.runDurationMs ?? null,
      inputSizeBytes: r.inputSizeBytes ?? null,
      inputSizeMb: r.inputSizeBytes != null ? Math.round((r.inputSizeBytes / (1024 * 1024)) * 100) / 100 : null,
      inputPageCount: r.inputPageCount ?? null,
      tokenUsage: r.tokenUsage as Record<string, unknown> | null,
      modelsUsed: r.modelsUsed as Record<string, string> | null,
      createdAt: r.createdAt?.toISOString() ?? null,
    }));

    return NextResponse.json(logs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load run logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
