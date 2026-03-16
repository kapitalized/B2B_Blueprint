/**
 * GET: Return extraction config (e.g. multilook flag) for the test page.
 * POST: Run floorplan pipeline with a given projectId + fileId, persist, then write
 * a test result to docs/Testing/floorplan-test-result.json so Cursor can inspect.
 * Body: { projectId, fileId }
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { runPipeline } from '@/lib/ai/orchestrator';
import { getAIModelConfig } from '@/lib/ai/model-config';
import { PLAN_TEXT_AND_COORDINATES_PROMPT } from '@/lib/ai/base-prompts';
import { persistPipelineResult } from '@/lib/ai/persistence';
import { loadLibraryContextForPipeline } from '@/lib/ai/library-context';
import { db } from '@/lib/db';
import { project_main, project_files } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/** GET: Current extraction mode and HF config so the test page can show the flags. */
export async function GET() {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const multilookEnabled = process.env.ENABLE_EXTRACTION_REVIEW_PASS === 'true';
  const hfToken = process.env.HUGGINGFACE_HUB_TOKEN ?? process.env.HF_TOKEN;
  const hfDisabled = process.env.USE_HF_FLOORPLAN_EXTRACTION === 'false' || process.env.USE_HF_FLOORPLAN_EXTRACTION === '0';
  const hfConfigured = Boolean(hfToken?.trim()) && !hfDisabled;
  return NextResponse.json({
    multilookEnabled,
    extractionMode: multilookEnabled ? 'multilook' : 'single-pass',
    hfConfigured,
    hfTokenSet: Boolean(hfToken?.trim()),
  });
}

export async function POST(req: Request) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { projectId, fileId } = body;
    if (!projectId || !fileId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, fileId' },
        { status: 400 }
      );
    }
    const ok = await canAccessProject(projectId, session.userId);
    if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const [fileRow] = await db
      .select({ blobUrl: project_files.blobUrl, fileName: project_files.fileName, buildingLevel: project_files.buildingLevel })
      .from(project_files)
      .where(eq(project_files.id, fileId));
    if (!fileRow?.blobUrl) {
      return NextResponse.json({ error: 'File not found or has no blob URL' }, { status: 404 });
    }

    const [projectRow] = await db
      .select({ projectName: project_main.projectName })
      .from(project_main)
      .where(eq(project_main.id, projectId));
    const projectName = projectRow?.projectName ?? 'Project';
    const reportType = 'quantity_takeoff';
    const libraryContext = await loadLibraryContextForPipeline(projectId);
    const docFirst5 = (fileRow.fileName ?? 'doc').replace(/\.[^.]+$/, '').replace(/\s+/g, '-').slice(0, 5) || 'doc';
    const reportTitle = `${projectName} - Floorplan test - ${docFirst5} - ${new Date().toISOString().slice(0, 10)}`;
    const modelsUsed = await getAIModelConfig();

    const runStartedAt = new Date();
    const result = await runPipeline({
      taskId: `test_${Date.now()}`,
      orgId: 'default',
      documentId: fileId,
      fileUrl: fileRow.blobUrl,
      sourceContent: `File: ${fileRow.fileName ?? fileId}`,
      libraryContext: libraryContext ?? {},
      benchmarks: [],
      templateId: 'takeoff',
    });
    const runDurationMs = Math.round(Date.now() - runStartedAt.getTime());

    const { reportId, reportShortId } = await persistPipelineResult({
      projectId,
      fileId,
      buildingLevel: fileRow.buildingLevel ?? null,
      result,
      reportTitle,
      reportType,
      modelsUsed: { extraction: modelsUsed.extraction, analysis: modelsUsed.analysis, synthesis: modelsUsed.synthesis },
      runMetadata: {
        runStartedAt,
        runDurationMs,
      },
    });

    const rawResponse = result.rawExtractionResponse ?? '';
    const extractionLabels = (result.raw_extraction?.items ?? []).map((i) => i?.label ?? '');
    const extractionSpaceIds = (result.raw_extraction?.items ?? []).map((i) => i?.id ?? '');
    const extractionWindows = (result.raw_extraction?.windows ?? []).map((w) => ({ id: (w as { id?: string }).id, label: (w as { label?: string }).label }));
    const extractionDoors = (result.raw_extraction?.doors ?? []).map((d) => ({ id: (d as { id?: string }).id, label: (d as { label?: string }).label }));
    const hasBbox = (item: { coordinate_polygons?: unknown }) =>
      Array.isArray(item?.coordinate_polygons) && (item.coordinate_polygons as unknown[]).length >= 4;
    const overlayItemsCount = (result.raw_extraction?.items ?? []).filter(hasBbox).length;
    const stepTraceList = result.stepTrace ?? [];
    const usedHF = stepTraceList.some(
      (s) =>
        (s.stepLabel && String(s.stepLabel).includes('Hugging Face')) ||
        (s.model && String(s.model).includes('FloorPlanVision'))
    );
    const extractionProvider = usedHF ? 'huggingface' : 'openrouter';
    const extractionProviderError = stepTraceList.find((s) => s.error)?.error ?? null;
    /** Number of vision calls that received the plan image (plan text + extraction + optional review pass). */
    const planLooksCount = stepTraceList.filter((s) => s.step === 'EXTRACTION').length;
    const payload = result.final_analysis?.items ?? [];
    const reportPayloadLabels = payload.map((i) => (i as { label?: string }).label ?? '');
    const reportPayloadValues = payload.map((i) => (i as { value?: number }).value ?? 0);
    const reportPayloadLengths = payload.map((i) => (i as { length_m?: number }).length_m);
    const reportPayloadWidths = payload.map((i) => (i as { width_m?: number }).width_m);

    const testResult = {
      ranAt: new Date().toISOString(),
      projectId,
      fileId,
      reportId,
      reportShortId: reportShortId ?? null,
      extractionProvider,
      extractionProviderError,
      /** Prompt used for the prior "extract text + coordinates from plan" step (when ENABLE_PLAN_TEXT_EXTRACTION is not false). */
      planTextExtractionPrompt: PLAN_TEXT_AND_COORDINATES_PROMPT,
      /** Raw text (or JSON) from the plan text step. */
      planTextExtraction: result.planTextExtraction ?? '',
      /** Parsed text items with labels and boxes for alignment (when step returned valid JSON). */
      planTextItems: result.planTextItems ?? [],
      /** Number of times the plan image was sent to the model (plan text + main extraction + optional review pass). */
      planLooksCount,
      /** Temperature used per pipeline step (lower = more deterministic). See docs/Testing/Temperature_And_Analysis.md. */
      temperatures: {
        planTextExtraction: 0,
        extraction: 0.2,
        extractionRetry: 0.2,
        ...(process.env.ENABLE_EXTRACTION_REVIEW_PASS === 'true' ? { extractionReviewPass: 0.2 } : {}),
        analysis: 0.3,
        synthesis: 'default',
      },
      extractionLabels,
      extractionSpaceIds,
      extractionWindows,
      extractionDoors,
      overlayItemsCount,
      reportPayloadLabels,
      reportPayloadValues,
      reportPayloadLengths,
      reportPayloadWidths,
      /** First 2000 chars of Gemini extraction response (full in floorplan-test-result-extraction-raw.json). */
      extractionResponsePreview: rawResponse.slice(0, 2000),
      extractionResponseLength: rawResponse.length,
      stepTrace: (result.stepTrace ?? []).map((s) => ({
        step: s.step,
        stepLabel: s.stepLabel,
        model: s.model,
        error: s.error,
        responsePreview: s.responsePreview,
      })),
      errors: [
        ...(overlayItemsCount === 0 && extractionLabels.length > 0 ? ['Overlay: no boxes drawn (items have no coordinate_polygons or overlay fallback failed)'] : []),
        ...(reportPayloadLabels.every((l) => !l || l === 'Room') && extractionLabels.some((l) => l && l !== 'Room') ? ['Report: all labels are "Room" but extraction had real names'] : []),
        ...(reportPayloadValues.every((v) => v === 0) && extractionLabels.length > 0 ? ['Report: all values are 0'] : []),
      ],
    };

    const outDir = path.join(process.cwd(), 'docs', 'Testing');
    await mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, 'floorplan-test-result.json');
    await writeFile(outPath, JSON.stringify(testResult, null, 2), 'utf-8');
    if (rawResponse) {
      const rawPath = path.join(outDir, 'floorplan-test-result-extraction-raw.json');
      await writeFile(rawPath, JSON.stringify({ ranAt: testResult.ranAt, reportId, rawExtractionResponse: rawResponse }, null, 2), 'utf-8');
    }

    return NextResponse.json({
      ok: true,
      reportId,
      reportShortId: reportShortId ?? null,
      testResult,
      outputFile: 'docs/Testing/floorplan-test-result.json',
      ...(rawResponse ? { extractionRawFile: 'docs/Testing/floorplan-test-result-extraction-raw.json' } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Test failed';
    console.error('[AI test-floorplan]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
