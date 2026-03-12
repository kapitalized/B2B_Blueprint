/**
 * Get a single report by id. User must own the project.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main, report_generated, ai_analyses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { reportId } = await params;
  if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  const [report] = await db
    .select()
    .from(report_generated)
    .where(eq(report_generated.id, reportId));
  if (!report?.projectId) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  const [project] = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(and(eq(project_main.id, report.projectId), eq(project_main.userId, session.userId)));
  if (!project) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  let data_payload: unknown[] = [];
  let runMetadata: { runStartedAt?: string; runDurationMs?: number; inputSizeBytes?: number; inputPageCount?: number; inputSizeMb?: number; tokenUsage?: Record<string, unknown> } | null = null;
  if (report.analysisSourceId) {
    const [analysis] = await db
      .select({
        analysisResult: ai_analyses.analysisResult,
        runStartedAt: ai_analyses.runStartedAt,
        runDurationMs: ai_analyses.runDurationMs,
        inputSizeBytes: ai_analyses.inputSizeBytes,
        inputPageCount: ai_analyses.inputPageCount,
        tokenUsage: ai_analyses.tokenUsage,
      })
      .from(ai_analyses)
      .where(eq(ai_analyses.id, report.analysisSourceId));
    const result = analysis?.analysisResult as { items?: unknown[]; synthesis?: { data_payload?: unknown[] } } | undefined;
    data_payload = result?.items ?? result?.synthesis?.data_payload ?? [];
    if (analysis && (analysis.runStartedAt != null || analysis.runDurationMs != null || analysis.inputSizeBytes != null || analysis.inputPageCount != null || analysis.tokenUsage != null)) {
      runMetadata = {
        runStartedAt: analysis.runStartedAt?.toISOString(),
        runDurationMs: analysis.runDurationMs ?? undefined,
        inputSizeBytes: analysis.inputSizeBytes ?? undefined,
        inputPageCount: analysis.inputPageCount ?? undefined,
        inputSizeMb: analysis.inputSizeBytes != null ? Math.round((analysis.inputSizeBytes / (1024 * 1024)) * 100) / 100 : undefined,
        tokenUsage: analysis.tokenUsage as Record<string, unknown> | undefined,
      };
    }
  }
  return NextResponse.json({
    id: report.id,
    reportTitle: report.reportTitle,
    reportType: report.reportType,
    content: report.content,
    content_md: report.content,
    data_payload,
    createdAt: report.createdAt,
    runMetadata: runMetadata ?? undefined,
  });
}
