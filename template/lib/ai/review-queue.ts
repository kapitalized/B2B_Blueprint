/**
 * Review queue (recommendation 2): filter tasks that need human review
 * (REVIEW_REQUIRED, critical warnings, or low confidence).
 */

import type { PipelineResult } from './orchestrator';
import type { ReviewQueueItem } from './types';

export function isNeedsReview(result: PipelineResult): boolean {
  if (result.status === 'REVIEW_REQUIRED') return true;
  const synthesis = result.final_analysis?.synthesis;
  if (synthesis?.criticalWarnings?.length) return true;
  const lowConfidence = result.raw_extraction?.items?.some(
    (i) => (i.confidence_score ?? 1) < 0.7
  );
  return Boolean(lowConfidence);
}

export function toReviewQueueItem(
  result: PipelineResult,
  runId: string,
  documentId?: string
): ReviewQueueItem {
  const synthesis = result.final_analysis?.synthesis;
  const criticalCount = synthesis?.criticalWarnings?.length ?? 0;
  const reason: ReviewQueueItem['reason'] =
    criticalCount > 0
      ? 'critical_warning'
      : result.status === 'REVIEW_REQUIRED'
        ? 'review_required'
        : 'low_confidence';

  return {
    taskId: result.taskId,
    runId,
    documentId,
    status: result.status,
    needsReview: true,
    reason,
    criticalWarningsCount: criticalCount,
    timestamp: new Date().toISOString(),
  };
}

/** Filter a list of pipeline results to those needing review. */
export function filterNeedsReview(
  results: Array<{ result: PipelineResult; runId: string; documentId?: string }>
): ReviewQueueItem[] {
  return results
    .filter(({ result }) => isNeedsReview(result))
    .map(({ result, runId, documentId }) => toReviewQueueItem(result, runId, documentId));
}
