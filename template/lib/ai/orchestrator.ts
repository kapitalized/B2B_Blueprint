/**
 * AI pipeline orchestrator: PENDING → EXTRACTING → ANALYZING → SYNTHESIZING → REVIEW_REQUIRED.
 * Blueprint @04_ai_module_blueprint, @05_ai_integration_guide.
 */

import { getModelForStep } from './model-selector';
import { callOpenRouter, isOpenRouterConfigured } from './openrouter';
import { runCitationAudit, type AuditItem, type Benchmark } from './citation-audit';

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
  const { taskId, sourceContent, libraryContext = {}, benchmarks = [] } = params;
  const hasKey = isOpenRouterConfigured();

  // Step 1: Vision extraction
  const extractionPrompt = `Extract from the following source as structured JSON. For each item include: id, label, confidence_score (0-1), and coordinate_polygons if spatial. Source: ${sourceContent ?? '[No content: add fileUrl or sourceContent]'}`;
  let raw_extraction: ExtractionResult;

  if (hasKey) {
    try {
      const content = await callOpenRouter({
        model: getModelForStep('EXTRACTION'),
        messages: [{ role: 'user', content: extractionPrompt }],
        max_tokens: 2048,
      });
      raw_extraction = parseExtraction(content);
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
  const analysisPrompt = `Given extraction: ${JSON.stringify(raw_extraction)}. Apply these constants: ${libraryStr || 'none'}. Output a JSON array of items with: id, label, value (number), unit, citation_id.`;
  let analysisItems: AuditItem[];

  if (hasKey) {
    try {
      const content = await callOpenRouter({
        model: getModelForStep('ANALYSIS'),
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 2048,
      });
      analysisItems = parseAnalysisItems(content);
    } catch {
      analysisItems = stubAnalysis(raw_extraction).items;
    }
  } else {
    analysisItems = stubAnalysis(raw_extraction).items;
  }

  // Step 3: Synthesis + citation audit
  const audit = runCitationAudit(analysisItems, benchmarks);
  const synthesisPrompt = `Format these analysis results as a short Markdown report. Items: ${JSON.stringify(analysisItems)}. ${audit.criticalWarnings.length > 0 ? `Add a CRITICAL WARNING section for: ${audit.criticalWarnings.map((w) => w.message).join('; ')}` : ''}`;
  let content_md: string;

  if (hasKey) {
    try {
      content_md = await callOpenRouter({
        model: getModelForStep('SYNTHESIS'),
        messages: [{ role: 'user', content: synthesisPrompt }],
        max_tokens: 2048,
      });
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
