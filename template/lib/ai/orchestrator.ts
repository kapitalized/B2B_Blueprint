/**
 * AI pipeline orchestrator: PENDING → EXTRACTING → ANALYZING → SYNTHESIZING → REVIEW_REQUIRED.
 * Blueprint @04_ai_module_blueprint, @05_ai_integration_guide.
 */

import { getModelForStep } from './model-selector';
import { callOpenRouter, isOpenRouterConfigured } from './openrouter';
import { runCitationAudit, type AuditItem, type Benchmark } from './citation-audit';
import { createAuditEntry, appendAuditEntry } from './audit-trail';
import { getPromptOverrides } from './templates';
import type { SourceSpan } from './types';

export const TASK_STATUSES = [
  'PENDING',
  'EXTRACTING',
  'ANALYZING',
  'SYNTHESIZING',
  'REVIEW_REQUIRED',
  'COMPLETED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface OrchestratorParams {
  taskId: string;
  orgId: string;
  runId?: string;
  documentId?: string;
  templateId?: string;
  taskType?: string;
  fileUrl?: string;
  /** Optional: text or description of the source (when no image URL). */
  sourceContent?: string;
  /** Knowledge Library constants for analysis (e.g. density, rates). */
  libraryContext?: Record<string, number | string>;
  /** Benchmarks for citation audit (key → expected value). */
  benchmarks?: Benchmark[];
}

export interface ExtractionResult {
  items: Array<{
    id: string;
    label: string;
    confidence_score: number;
    source_span?: SourceSpan;
    coordinate_polygons?: unknown;
    raw?: unknown;
  }>;
}

export interface AnalysisResult {
  items: AuditItem[];
}

export interface SynthesisResult {
  content_md: string;
  data_payload: AuditItem[];
  criticalWarnings: Array<{ itemId: string; label: string; deviation: number; message: string }>;
}

export interface PipelineResult {
  status: TaskStatus;
  taskId: string;
  runId?: string;
  raw_extraction: ExtractionResult;
  final_analysis: AnalysisResult & { synthesis?: SynthesisResult };
  is_verified: false;
}

function stubExtraction(): ExtractionResult {
  return {
    items: [
      { id: '1', label: 'Sample item', confidence_score: 0.9, coordinate_polygons: [] },
    ],
  };
}

function stubAnalysis(extraction: ExtractionResult): AnalysisResult {
  return {
    items: extraction.items.map((e) => ({
      id: e.id,
      label: e.label,
      value: 100,
      unit: 'm²',
      citation_id: e.id,
    })),
  };
}

/**
 * Run the 3-step pipeline. When OPENROUTER_API_KEY is not set, uses stub data so the flow completes.
 */
export async function runPipeline(params: OrchestratorParams): Promise<PipelineResult> {
  const { taskId, sourceContent, libraryContext = {}, benchmarks = [], templateId, documentId } = params;
  const runId = params.runId ?? `run_${taskId}`;
  const hasKey = isOpenRouterConfigured();
  const overrides = templateId ? getPromptOverrides(templateId) : {};

  // Step 1: Vision extraction
  const extractionBase = overrides.extraction ?? 'Extract from the following source as structured JSON. For each item include: id, label, confidence_score (0-1), and coordinate_polygons if spatial.';
  const extractionPrompt = `${extractionBase} Source: ${sourceContent ?? '[No content: add fileUrl or sourceContent]'}`;
  let raw_extraction: ExtractionResult;
  const extractionModel = getModelForStep('EXTRACTION');

  if (hasKey) {
    try {
      const content = await callOpenRouter({
        model: extractionModel,
        messages: [{ role: 'user', content: extractionPrompt }],
        max_tokens: 2048,
      });
      raw_extraction = parseExtraction(content);
      appendAuditEntry(createAuditEntry({ runId, taskId, model: extractionModel, step: 'EXTRACTION', orgId: params.orgId, documentId }));
    } catch {
      raw_extraction = stubExtraction();
    }
  } else {
    raw_extraction = stubExtraction();
  }

  // Step 2: Reasoning analysis (apply library constants, math)
  const libraryStr = Object.entries(libraryContext)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  const analysisBase = overrides.analysis ?? 'Given extraction: apply constants. Output a JSON array of items with: id, label, value (number), unit, citation_id.';
  const analysisPrompt = `${analysisBase} Extraction: ${JSON.stringify(raw_extraction)}. Constants: ${libraryStr || 'none'}.`;
  let analysisItems: AuditItem[];
  const analysisModel = getModelForStep('ANALYSIS');

  if (hasKey) {
    try {
      const content = await callOpenRouter({
        model: analysisModel,
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 2048,
      });
      analysisItems = parseAnalysisItems(content);
      appendAuditEntry(createAuditEntry({ runId, taskId, model: analysisModel, step: 'ANALYSIS', orgId: params.orgId, documentId }));
    } catch {
      analysisItems = stubAnalysis(raw_extraction).items;
    }
  } else {
    analysisItems = stubAnalysis(raw_extraction).items;
  }

  // Step 3: Synthesis + citation audit
  const audit = runCitationAudit(analysisItems, benchmarks);
  const synthesisBase = overrides.synthesis ?? 'Format these analysis results as a short Markdown report.';
  const synthesisPrompt = `${synthesisBase} Items: ${JSON.stringify(analysisItems)}. ${audit.criticalWarnings.length > 0 ? `Add a CRITICAL WARNING section for: ${audit.criticalWarnings.map((w) => w.message).join('; ')}` : ''}`;
  let content_md: string;
  const synthesisModel = getModelForStep('SYNTHESIS');

  if (hasKey) {
    try {
      content_md = await callOpenRouter({
        model: synthesisModel,
        messages: [{ role: 'user', content: synthesisPrompt }],
        max_tokens: 2048,
      });
      appendAuditEntry(createAuditEntry({ runId, taskId, model: synthesisModel, step: 'SYNTHESIS', orgId: params.orgId, documentId }));
    } catch {
      content_md = formatStubReport(analysisItems, audit);
    }
  } else {
    content_md = formatStubReport(analysisItems, audit);
  }

  const synthesis: SynthesisResult = {
    content_md,
    data_payload: analysisItems,
    criticalWarnings: audit.criticalWarnings,
  };

  return {
    status: 'REVIEW_REQUIRED',
    taskId,
    runId,
    raw_extraction,
    final_analysis: { items: analysisItems, synthesis },
    is_verified: false,
  };
}

function parseExtraction(content: string): ExtractionResult {
  try {
    const parsed = JSON.parse(extractJson(content));
    if (Array.isArray(parsed)) return { items: parsed };
    if (parsed?.items) return parsed as ExtractionResult;
    return { items: [parsed].filter(Boolean) };
  } catch {
    return stubExtraction();
  }
}

function parseAnalysisItems(content: string): AuditItem[] {
  try {
    const parsed = JSON.parse(extractJson(content));
    const arr = Array.isArray(parsed) ? parsed : parsed?.items ?? [parsed];
    return arr.map((x: unknown) => ({
      id: String((x as AuditItem).id ?? ''),
      label: String((x as AuditItem).label ?? ''),
      value: Number((x as AuditItem).value ?? 0),
      unit: (x as AuditItem).unit,
      citation_id: (x as AuditItem).citation_id,
      coordinate_set: (x as AuditItem).coordinate_set,
    }));
  } catch {
    return [];
  }
}

function extractJson(text: string): string {
  const start = text.indexOf('[') >= 0 ? text.indexOf('[') : text.indexOf('{');
  const end = text.lastIndexOf(']') >= 0 ? text.lastIndexOf(']') + 1 : text.lastIndexOf('}') + 1;
  if (start >= 0 && end > start) return text.slice(start, end);
  return text;
}

function formatStubReport(
  items: AuditItem[],
  audit: { criticalWarnings: Array<{ message: string }> }
): string {
  let md = '### Analysis Report\n\n| Item | Value | Unit |\n|------|-------|------|\n';
  for (const i of items) {
    md += `| ${i.label} | ${i.value} | ${i.unit ?? '-'} |\n`;
  }
  if (audit.criticalWarnings.length > 0) {
    md += '\n**CRITICAL WARNING**\n\n';
    for (const w of audit.criticalWarnings) md += `- ${w.message}\n`;
  }
  return md;
}
