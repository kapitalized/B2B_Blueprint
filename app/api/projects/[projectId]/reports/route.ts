/**
 * List reports for a project. User must own the project.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main, report_generated, ai_analyses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

async function ensureProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(and(eq(project_main.id, projectId), eq(project_main.userId, userId)));
  return !!row;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await ensureProjectOwnership(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  try {
    const reports = await db
      .select({
        id: report_generated.id,
        reportTitle: report_generated.reportTitle,
        reportType: report_generated.reportType,
        createdAt: report_generated.createdAt,
        runStartedAt: ai_analyses.runStartedAt,
        runDurationMs: ai_analyses.runDurationMs,
      })
      .from(report_generated)
      .leftJoin(ai_analyses, eq(report_generated.analysisSourceId, ai_analyses.id))
      .where(eq(report_generated.projectId, projectId))
      .orderBy(desc(report_generated.createdAt));
    return NextResponse.json(reports.map((r) => ({
      id: r.id,
      reportTitle: r.reportTitle,
      reportType: r.reportType,
      createdAt: r.createdAt,
      runStartedAt: r.runStartedAt?.toISOString() ?? null,
      runDurationMs: r.runDurationMs ?? null,
    })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
