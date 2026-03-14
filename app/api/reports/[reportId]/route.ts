/**
 * Get a single report by id. User must own the project.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { report_generated, ai_analyses, project_files } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { reportId } = await params;
  if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  const isUuid = UUID_REGEX.test(reportId);
  const [report] = await db
    .select()
    .from(report_generated)
    .where(isUuid ? eq(report_generated.id, reportId) : eq(report_generated.shortId, reportId));
  if (!report?.projectId) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  const ok = await canAccessProject(report.projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  let data_payload: unknown[] = [];
  let runMetadata: {
    runStartedAt?: string;
    runDurationMs?: number;
    inputSizeBytes?: number;
    inputPageCount?: number;
    inputSizeMb?: number;
    tokenUsage?: Record<string, unknown>;
    stepTrace?: Array<{ step: string; model: string; promptPreview: string; responsePreview: string; tokenUsage?: unknown; error?: string }>;
    modelsUsed?: Record<string, string>;
    documentSource?: string[];
  } | null = null;
  if (report.analysisSourceId) {
    const [analysis] = await db
      .select({
        analysisResult: ai_analyses.analysisResult,
        runStartedAt: ai_analyses.runStartedAt,
        runDurationMs: ai_analyses.runDurationMs,
        inputSizeBytes: ai_analyses.inputSizeBytes,
        inputPageCount: ai_analyses.inputPageCount,
        tokenUsage: ai_analyses.tokenUsage,
        stepTrace: ai_analyses.stepTrace,
        modelsUsed: ai_analyses.modelsUsed,
        inputSourceIds: ai_analyses.inputSourceIds,
      })
      .from(ai_analyses)
      .where(eq(ai_analyses.id, report.analysisSourceId));
    const result = analysis?.analysisResult as { items?: unknown[]; synthesis?: { data_payload?: unknown[] } } | undefined;
    data_payload = result?.items ?? result?.synthesis?.data_payload ?? [];
    if (analysis) {
      const sourceIds = analysis.inputSourceIds as string[] | undefined;
      let documentSource: string[] | undefined;
      if (Array.isArray(sourceIds) && sourceIds.length > 0) {
        const files = await db
          .select({ fileName: project_files.fileName })
          .from(project_files)
          .where(inArray(project_files.id, sourceIds));
        documentSource = files.map((f) => f.fileName ?? 'Unknown').filter(Boolean);
      }
      runMetadata = {
        runStartedAt: analysis.runStartedAt?.toISOString(),
        runDurationMs: analysis.runDurationMs ?? undefined,
        inputSizeBytes: analysis.inputSizeBytes ?? undefined,
        inputPageCount: analysis.inputPageCount ?? undefined,
        inputSizeMb: analysis.inputSizeBytes != null ? Math.round((analysis.inputSizeBytes / (1024 * 1024)) * 100) / 100 : undefined,
        tokenUsage: analysis.tokenUsage as Record<string, unknown> | undefined,
        stepTrace: analysis.stepTrace as Array<{ step: string; model: string; promptPreview: string; responsePreview: string; tokenUsage?: unknown; error?: string }> | undefined,
        modelsUsed: analysis.modelsUsed as Record<string, string> | undefined,
        documentSource,
      };
    }
  }
  return NextResponse.json({
    id: report.id,
    shortId: report.shortId ?? null,
    reportTitle: report.reportTitle,
    reportType: report.reportType,
    content: report.content,
    content_md: report.content,
    data_payload,
    createdAt: report.createdAt,
    runMetadata: runMetadata ?? undefined,
  });
}
