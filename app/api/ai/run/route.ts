/**
 * Trigger the 3-step AI pipeline (orchestrator) and persist to DB.
 * POST body: { projectId, fileId?, fileUrl?, taskId?, orgId?, sourceContent?, libraryContext?, benchmarks? }
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { runPipeline } from '@/lib/ai/orchestrator';
import { getAIModelConfig } from '@/lib/ai/model-config';
import { persistPipelineResult } from '@/lib/ai/persistence';
import { writeLogReport, writeLogAiRun } from '@/lib/ai/logs';
import { indexDigestToKnowledgeNodes } from '@/lib/ai/knowledge-nodes';
import { loadLibraryContextForPipeline } from '@/lib/ai/library-context';
import { db } from '@/lib/db';
import { project_main, project_files } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';

export async function POST(req: Request) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rateLimitRes = rateLimit(session.userId, 'ai-run', 10);
  if (rateLimitRes) return rateLimitRes;
  try {
    const body = await req.json();
    const {
      projectId,
      fileId,
      fileUrl,
      taskId = `task_${Date.now()}`,
      orgId = 'default',
      sourceContent,
      benchmarks,
      templateId,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }
    const ok = await canAccessProject(projectId, session.userId);
    if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const reportType = body.reportType ?? (body.fileUrl ? 'quantity_takeoff' : 'quantity_takeoff');
    const reportTypeLabel = reportType === 'defect_audit' ? 'Defect audit' : reportType === 'quantity_takeoff' ? 'Quantity takeoff' : reportType;

    const libraryContextFromDb = await loadLibraryContextForPipeline(projectId);
    const mergedLibraryContext = { ...libraryContextFromDb, ...(body.libraryContext ?? {}) };

    const [projectRow] = await db
      .select({ projectName: project_main.projectName })
      .from(project_main)
      .where(eq(project_main.id, projectId));
    const projectName = projectRow?.projectName ?? 'Project';

    let inputSizeBytes: number | undefined;
    let fileName: string | undefined;
    let fileBuildingLevel: number | null = null;
    if (fileId) {
      const [fileRow] = await db
        .select({ fileSize: project_files.fileSize, fileName: project_files.fileName, buildingLevel: project_files.buildingLevel })
        .from(project_files)
        .where(eq(project_files.id, fileId));
      if (fileRow?.fileSize != null) inputSizeBytes = fileRow.fileSize;
      if (fileRow?.fileName) fileName = fileRow.fileName;
      if (fileRow?.buildingLevel != null) fileBuildingLevel = fileRow.buildingLevel;
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
      documentId: fileId ?? undefined,
      fileUrl: fileUrl ?? undefined,
      sourceContent: sourceContent ?? (fileUrl ? 'See attached image (floorplan/drawing).' : 'Sample document content for extraction.'),
      libraryContext: mergedLibraryContext,
      benchmarks: benchmarks ?? [],
      templateId: templateId ?? (fileUrl ? 'takeoff' : undefined),
    });
    const runDurationMs = Math.round(Date.now() - runStartedAt.getTime());

    const { digestId, analysisId, reportId, reportShortId } = await persistPipelineResult({
      projectId,
      fileId: fileId ?? null,
      buildingLevel: fileBuildingLevel,
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

    await writeLogReport({
      projectId,
      userId: session.userId,
      reportId,
      analysisId,
      reportType,
      source: 'pipeline',
      fileIds: fileId ? [fileId] : [],
    });

    const synthesisMd = result.final_analysis?.synthesis?.content_md ?? '';
    const rawText = result.raw_extraction != null ? '\n\n' + JSON.stringify(result.raw_extraction) : '';
    const textToIndex = (synthesisMd + rawText).trim();
    let knowledgeNodesIndexed = 0;
    if (textToIndex) {
      try {
        const { indexed } = await indexDigestToKnowledgeNodes({
          projectId,
          fileId: fileId ?? null,
          text: textToIndex,
        });
        knowledgeNodesIndexed = indexed;
      } catch (e) {
        console.error('[AI run] indexDigestToKnowledgeNodes failed:', e);
      }
    }

    const usage = result.tokenUsage as { total_prompt_tokens?: number; total_completion_tokens?: number; total_tokens?: number; total_cost?: number } | undefined;
    await writeLogAiRun({
      eventType: 'pipeline_run',
      projectId,
      userId: session.userId,
      provider: 'openrouter',
      model: modelsUsed.extraction ?? modelsUsed.analysis ?? modelsUsed.synthesis ?? undefined,
      inputTokens: usage?.total_prompt_tokens ?? undefined,
      outputTokens: usage?.total_completion_tokens ?? undefined,
      totalTokens: usage?.total_tokens ?? undefined,
      cost: usage?.total_cost ?? undefined,
      latencyMs: runDurationMs,
      metadata: { taskId, fileId: fileId ?? undefined, digestId, analysisId, reportId },
    });

    const extractionModelLabel = modelsUsed.extraction?.split('/').pop() ?? modelsUsed.extraction ?? 'AI model';

    return NextResponse.json({
      ...result,
      persisted: { digestId, analysisId, reportId },
      reportId,
      reportShortId: reportShortId ?? null,
      modelName: extractionModelLabel,
      runMetadata: {
        runStartedAt: runStartedAt.toISOString(),
        runDurationMs,
        inputSizeBytes: inputSizeBytes ?? undefined,
        inputSizeMb: inputSizeBytes != null ? Math.round((inputSizeBytes / (1024 * 1024)) * 100) / 100 : undefined,
        inputPageCount: body.inputPageCount != null ? Number(body.inputPageCount) : (fileId ? 1 : undefined),
        tokenUsage: result.tokenUsage,
        knowledgeNodesIndexed,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline failed';
    console.error('[AI run]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
