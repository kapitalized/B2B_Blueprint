/**
 * Shared types for the AI module (8 recommendations: audit, review queue, run history,
 * export, batch, templates, confidence & grounding, source-first/click-to-cite).
 */

/** Audit trail: one log entry per pipeline run for compliance. */
export interface AuditTrailEntry {
  runId: string;
  taskId: string;
  model: string;
  promptVersion: string;
  timestamp: string; // ISO
  step?: 'EXTRACTION' | 'ANALYSIS' | 'SYNTHESIS';
  orgId?: string;
  documentId?: string;
}

/** Source span for click-to-cite: page/region in the source doc. */
export interface SourceSpan {
  page?: number;
  region?: string; // e.g. "x,y,w,h" or "block-id"
  excerpt?: string;
}

/** Finding with confidence and grounding (recommendation 8). */
export interface FindingWithGrounding {
  id: string;
  label: string;
  value?: number;
  unit?: string;
  confidence_score: number;
  source_span?: SourceSpan;
  citation_id?: string;
  coordinate_set?: unknown;
}

/** Run history item: one analysis run per document (recommendation 3). */
export interface RunHistoryItem {
  runId: string;
  taskId: string;
  documentId: string;
  timestamp: string;
  status: string;
  hasCriticalWarnings?: boolean;
  summary?: string;
}

/** Review queue: item that needs human review (recommendation 2). */
export interface ReviewQueueItem {
  taskId: string;
  runId: string;
  documentId?: string;
  status: string;
  needsReview: true;
  reason: 'critical_warning' | 'low_confidence' | 'review_required';
  criticalWarningsCount?: number;
  timestamp: string;
}

/** Report template per doc type (recommendation 7). */
export interface ReportTemplate {
  id: string;
  docType: string;
  name: string;
  promptOverrides?: {
    extraction?: string;
    analysis?: string;
    synthesis?: string;
  };
  defaultBenchmarks?: Array<{ key: string; value: number; unit?: string }>;
}

/** Batch run input (recommendation 5). */
export interface BatchRunInput {
  documentId: string;
  fileUrl?: string;
  sourceContent?: string;
  templateId?: string;
}

/** Batch run result (recommendation 5). */
export interface BatchRunResult {
  documentId: string;
  taskId: string;
  runId: string;
  status: string;
  error?: string;
  summary?: string;
}
