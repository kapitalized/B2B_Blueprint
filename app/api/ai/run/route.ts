/**
 * Trigger the 3-step AI pipeline (orchestrator) and persist to DB.
 * POST body: { projectId, fileId?, fileUrl?, taskId?, orgId?, sourceContent?, libraryContext?, benchmarks? }
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { runPipeline } from '@/lib/ai/orchestrator';
import { getAIModelConfig } from '@/lib/ai/model-config';
import { persistPipelineResult } from '@/lib/ai/persistence';
import { db } from '@/lib/db';
import { project_main, project_files } from '@/lib/db/schema';
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
      templateId,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }
    const ok = await ensureProjectOwnership(projectId, session.userId);
    if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const reportType = body.reportType ?? (body.fileUrl ? 'quantity_takeoff' : 'quantity_takeoff');
    const reportTypeLabel = reportType === 'defect_audit' ? 'Defect audit' : reportType === 'quantity_takeoff' ? 'Quantity takeoff' : reportType;

    const [projectRow] = await db
      .select({ projectName: project_main.projectName })
      .from(project_main)
      .where(eq(project_main.id, projectId));
    const projectName = projectRow?.projectName ?? 'Project';

    let inputSizeBytes: number | undefined;
    let fileName: string | undefined;
    if (fileId) {
      const [fileRow] = await db
        .select({ fileSize: project_files.fileSize, fileName: project_files.fileName })
        .from(project_files)
        .where(eq(project_files.id, fileId));
      if (fileRow?.fileSize != null) inputSizeBytes = fileRow.fileSize;
      if (fileRow?.fileName) fileName = fileRow.fileName;
    }
    const docFirst5 = fileName
      ? fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, '-').slice(0, 5) || 'doc'
      : 'doc';
    const dateStr = new Date().toISOString().slice(0, 10);
    const reportTitle = `${projectName} - ${reportTypeLabel} - ${docFirst5} - ${dateStr}`;

    const modelsUsed = await getAIModelConfig();
    const runStartedAt = new Date();
    const result = await runPipeline({
      taskId,
      orgId,
      fileId: fileId ?? undefined,
      fileUrl: fileUrl ?? undefined,
      sourceContent: sourceContent ?? (fileUrl ? 'See attached image (floorplan/drawing).' : 'Sample document content for extraction.'),
      libraryContext: libraryContext ?? {},
      benchmarks: benchmarks ?? [],
      templateId: templateId ?? (fileUrl ? 'takeoff' : undefined),
    });
    const runDurationMs = Math.round(Date.now() - runStartedAt.getTime());

    const { digestId, analysisId, reportId } = await persistPipelineResult({
      projectId,
      fileId: fileId ?? null,
      result,
      reportTitle,
      reportType,
      modelsUsed: { extraction: modelsUsed.extraction, analysis: modelsUsed.analysis, synthesis: modelsUsed.synthesis },
      runMetadata: {
        runStartedAt,
        runDurationMs,
        inputSizeBytes: inputSizeBytes ?? undefined,
        inputPageCount: body.inputPageCount != null ? Number(body.inputPageCount) : (fileId ? 1 : undefined),
      },
    });

    return NextResponse.json({
      ...result,
      persisted: { digestId, analysisId, reportId },
      runMetadata: {
        runStartedAt: runStartedAt.toISOString(),
        runDurationMs,
        inputSizeBytes: inputSizeBytes ?? undefined,
        inputSizeMb: inputSizeBytes != null ? Math.round((inputSizeBytes / (1024 * 1024)) * 100) / 100 : undefined,
        inputPageCount: body.inputPageCount != null ? Number(body.inputPageCount) : (fileId ? 1 : undefined),
        tokenUsage: result.tokenUsage,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline failed';
    console.error('[AI run]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
