/**
 * Multi-file & batch (recommendation 5): run pipeline per document; compare/aggregate.
 */

import { runPipeline } from './orchestrator';
import { appendRunHistory } from './run-history';
import type { BatchRunInput, BatchRunResult } from './types';
import type { PipelineResult } from './orchestrator';
import { getTemplate } from './templates';

export interface BatchPipelineResult {
  results: BatchRunResult[];
  completed: number;
  failed: number;
  /** When all succeed, optional aggregate summary. */
  aggregate?: { totalTasks: number; totalCriticalWarnings: number };
}

/**
 * Run the pipeline for each input. Uses template if templateId provided.
 * Persist to Supabase when connected; for now appends to in-memory run history.
 */
export async function runBatchPipeline(
  inputs: BatchRunInput[],
  options?: { orgId: string; libraryContext?: Record<string, number | string>; benchmarks?: Array<{ key: string; value: number; unit?: string }> }
): Promise<BatchPipelineResult> {
  const orgId = options?.orgId ?? 'default-org';
  const results: BatchRunResult[] = [];
  let totalCriticalWarnings = 0;

  for (const input of inputs) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const runId = `run_${taskId}`;
    const template = input.templateId ? getTemplate(input.templateId) : undefined;

    try {
      const result: PipelineResult = await runPipeline({
        taskId,
        runId,
        orgId,
        documentId: input.documentId,
        templateId: input.templateId,
        sourceContent: input.sourceContent ?? 'No content',
        fileUrl: input.fileUrl,
        libraryContext: options?.libraryContext,
        benchmarks: template?.defaultBenchmarks ?? options?.benchmarks ?? [],
      });

      const synthesis = result.final_analysis?.synthesis;
      const criticalCount = synthesis?.criticalWarnings?.length ?? 0;
      totalCriticalWarnings += criticalCount;

      appendRunHistory({
        runId,
        taskId,
        documentId: input.documentId,
        timestamp: new Date().toISOString(),
        status: result.status,
        hasCriticalWarnings: criticalCount > 0,
        summary: synthesis?.content_md?.slice(0, 200),
      });

      results.push({
        documentId: input.documentId,
        taskId,
        runId,
        status: result.status,
        summary: synthesis?.content_md?.slice(0, 200),
      });
    } catch (err) {
      results.push({
        documentId: input.documentId,
        taskId,
        runId,
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const completed = results.filter((r) => r.status !== 'FAILED').length;
  const failed = results.length - completed;

  return {
    results,
    completed,
    failed,
    aggregate:
      failed === 0
        ? { totalTasks: results.length, totalCriticalWarnings }
        : undefined,
  };
}
