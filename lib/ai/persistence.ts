/**
 * Persist pipeline and analyze results to the DB (ai_digests, ai_analyses, report_generated).
 */

import { db } from '@/lib/db';
import { ai_digests, ai_analyses, report_generated } from '@/lib/db/schema';
import { generateShortId } from '@/lib/project-url';
import { eq } from 'drizzle-orm';
import type { PipelineResult } from './orchestrator';

export interface RunMetadata {
  runStartedAt?: Date;
  runDurationMs?: number;
  inputSizeBytes?: number;
  inputPageCount?: number;
  tokenUsage?: Record<string, unknown>;
}

export interface PersistPipelineParams {
  projectId: string;
  fileId?: string | null;
  /** Building level (1-based) from file, for reports/digests. */
  buildingLevel?: number | null;
  result: PipelineResult;
  reportTitle?: string;
  reportType?: string;
  runMetadata?: RunMetadata;
  /** Model ids used for this run (snapshot from getAIModelConfig()). */
  modelsUsed?: { extraction?: string; analysis?: string; synthesis?: string };
}

/** Save pipeline result to ai_digests, ai_analyses, and report_generated. */
export async function persistPipelineResult(params: PersistPipelineParams): Promise<{
  digestId: string;
  analysisId: string;
  reportId: string;
  reportShortId: string | null;
}> {
  const { projectId, fileId, buildingLevel, result, reportTitle = 'AI Analysis Report', reportType = 'quantity_takeoff', runMetadata, modelsUsed } = params;
  const tokenUsage = result.tokenUsage ? (result.tokenUsage as unknown as Record<string, unknown>) : null;
  const modelsUsedJson = modelsUsed ? (modelsUsed as unknown as Record<string, unknown>) : null;

  const [digest] = await db
    .insert(ai_digests)
    .values({
      projectId,
      fileId: fileId ?? null,
      buildingLevel: buildingLevel ?? null,
      rawExtraction: result.raw_extraction as unknown as Record<string, unknown>,
      summary: result.final_analysis?.synthesis?.content_md?.slice(0, 500) ?? null,
    })
    .returning({ id: ai_digests.id });
  if (!digest?.id) throw new Error('Failed to insert digest');
  const digestId = digest.id;

  const synthesis = result.final_analysis?.synthesis;
  const analysisPayload = {
    items: result.final_analysis?.items ?? [],
    synthesis: synthesis ? { content_md: synthesis.content_md, criticalWarnings: synthesis.criticalWarnings } : undefined,
  };
  const stepTraceJson = result.stepTrace && result.stepTrace.length > 0
    ? (result.stepTrace as unknown as Record<string, unknown>[])
    : null;
  const [analysis] = await db
    .insert(ai_analyses)
    .values({
      projectId,
      analysisType: reportType,
      analysisResult: analysisPayload as unknown as Record<string, unknown>,
      inputSourceIds: fileId ? [fileId] : [],
      rawExtraction: result.raw_extraction as unknown as Record<string, unknown>,
      runStartedAt: runMetadata?.runStartedAt ?? null,
      runDurationMs: runMetadata?.runDurationMs ?? null,
      inputSizeBytes: runMetadata?.inputSizeBytes ?? null,
      inputPageCount: runMetadata?.inputPageCount ?? null,
      tokenUsage: tokenUsage ?? null,
      modelsUsed: modelsUsedJson ?? null,
      stepTrace: stepTraceJson,
    })
    .returning({ id: ai_analyses.id });
  if (!analysis?.id) throw new Error('Failed to insert analysis');
  const analysisId = analysis.id;

  const reportValues = {
    projectId,
    reportTitle,
    reportType,
    buildingLevel: buildingLevel ?? null,
    content: synthesis?.content_md ?? null,
    analysisSourceId: analysisId,
  };
  let report: { id: string; shortId?: string | null } | undefined;
  let reportShortId: string | null = null;
  try {
    reportShortId = generateShortId();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.select({ id: report_generated.id }).from(report_generated).where(eq(report_generated.shortId, reportShortId)).limit(1);
      if (existing.length === 0) break;
      reportShortId = generateShortId();
    }
    const [row] = await db
      .insert(report_generated)
      .values({ ...reportValues, shortId: reportShortId })
      .returning({ id: report_generated.id, shortId: report_generated.shortId });
    report = row;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('short_id') && (msg.includes('does not exist') || msg.includes('column'))) {
      const [row] = await db.insert(report_generated).values(reportValues).returning({ id: report_generated.id });
      report = row ? { id: row.id } : undefined;
      reportShortId = null;
    } else {
      throw err;
    }
  }
  if (!report?.id) throw new Error('Failed to insert report');
  const reportId = report.id;
  return { digestId, analysisId, reportId, reportShortId: report.shortId ?? reportShortId ?? null };
}

export interface PersistAnalyzeParams {
  projectId: string;
  fileId?: string | null;
  results: Array<{ id?: string; label: string; area_m2: number; volume_m3: number; verified?: boolean }>;
  metadata?: Record<string, unknown>;
}

/** Save /api/analyze (Python) result to ai_analyses and optionally report_generated. */
export async function persistAnalyzeResult(params: PersistAnalyzeParams): Promise<{ analysisId: string; reportId: string }> {
  const { projectId, fileId, results, metadata = {} } = params;
  const [analysis] = await db
    .insert(ai_analyses)
    .values({
      projectId,
      analysisType: 'quantities',
      analysisResult: { results, metadata } as unknown as Record<string, unknown>,
      inputSourceIds: fileId ? [fileId] : [],
    })
    .returning({ id: ai_analyses.id });
  if (!analysis?.id) throw new Error('Failed to insert analysis');
  const analysisId = analysis.id;

  const contentMd = [
    '### Quantity Report',
    '',
    '| Label | Area (m²) | Volume (m³) |',
    '|-------|-----------|-------------|',
    ...results.map((r) => `| ${r.label} | ${r.area_m2} | ${r.volume_m3} |`),
  ].join('\n');
  let reportShortId = generateShortId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.select({ id: report_generated.id }).from(report_generated).where(eq(report_generated.shortId, reportShortId)).limit(1);
    if (existing.length === 0) break;
    reportShortId = generateShortId();
  }
  const [report] = await db
    .insert(report_generated)
    .values({
      projectId,
      shortId: reportShortId,
      reportTitle: 'Quantity takeoff',
      reportType: 'quantity_takeoff',
      content: contentMd,
      analysisSourceId: analysisId,
    })
    .returning({ id: report_generated.id });
  if (!report?.id) throw new Error('Failed to insert report');
  return { analysisId, reportId: report.id };
}
