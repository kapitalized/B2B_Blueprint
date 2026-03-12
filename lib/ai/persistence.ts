/**
 * Persist pipeline and analyze results to the DB (ai_digests, ai_analyses, report_generated).
 */

import { db } from '@/lib/db';
import { ai_digests, ai_analyses, report_generated } from '@/lib/db/schema';
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
}> {
  const { projectId, fileId, result, reportTitle = 'AI Analysis Report', reportType = 'quantity_takeoff', runMetadata, modelsUsed } = params;
  const tokenUsage = result.tokenUsage ? (result.tokenUsage as unknown as Record<string, unknown>) : null;
  const modelsUsedJson = modelsUsed ? (modelsUsed as unknown as Record<string, unknown>) : null;

  const [digest] = await db
    .insert(ai_digests)
    .values({
      projectId,
      fileId: fileId ?? null,
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
  const [analysis] = await db
    .insert(ai_analyses)
    .values({
      projectId,
      analysisType: reportType,
      analysisResult: analysisPayload as unknown as Record<string, unknown>,
      inputSourceIds: fileId ? [fileId] : [],
      runStartedAt: runMetadata?.runStartedAt ?? null,
      runDurationMs: runMetadata?.runDurationMs ?? null,
      inputSizeBytes: runMetadata?.inputSizeBytes ?? null,
      inputPageCount: runMetadata?.inputPageCount ?? null,
      tokenUsage: tokenUsage ?? null,
      modelsUsed: modelsUsedJson ?? null,
    })
    .returning({ id: ai_analyses.id });
  if (!analysis?.id) throw new Error('Failed to insert analysis');
  const analysisId = analysis.id;

  const [report] = await db
    .insert(report_generated)
    .values({
      projectId,
      reportTitle,
      reportType,
      content: synthesis?.content_md ?? null,
      analysisSourceId: analysisId,
    })
    .returning({ id: report_generated.id });
  if (!report?.id) throw new Error('Failed to insert report');
  const reportId = report.id;

  return { digestId, analysisId, reportId };
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
  const [report] = await db
    .insert(report_generated)
    .values({
      projectId,
      reportTitle: 'Quantity takeoff',
      reportType: 'quantity_takeoff',
      content: contentMd,
      analysisSourceId: analysisId,
    })
    .returning({ id: report_generated.id });
  if (!report?.id) throw new Error('Failed to insert report');
  return { analysisId, reportId: report.id };
}
