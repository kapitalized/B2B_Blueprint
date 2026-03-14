/**
 * AI pipeline orchestrator: PENDING → EXTRACTING → ANALYZING → SYNTHESIZING → REVIEW_REQUIRED.
 * Blueprint @04_ai_module_blueprint, @05_ai_integration_guide.
 */

import { getAIModelConfig } from './model-config';
import { getExtractionModelForVision } from './openrouter-models';
import { getSystemPrompt, EXTRACTION_VISION_SYSTEM, EXTRACTION_VISION_USER_PROMPT } from './base-prompts';
import { callOpenRouter, isOpenRouterConfigured } from './openrouter';
import { runCitationAudit, type AuditItem, type Benchmark } from './citation-audit';
import { createAuditEntry, appendAuditEntry } from './audit-trail';
import { getPromptOverrides } from './templates';
import { callPythonEngine } from '@/lib/python-client';
import { isPrivateBlobUrl, privateBlobToDataUrl } from '@/lib/blob';
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
    /** From floorplan extraction (detections.metadata.approx_area_m2). */
    area_m2?: number;
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

/** Token usage per step and totals (from OpenRouter). */
export interface PipelineTokenUsage {
  extraction?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
  analysis?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
  synthesis?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost?: number;
}

/** Per-step trace for observability: what was sent and what came back. */
export interface StepTraceEntry {
  step: 'EXTRACTION' | 'ANALYSIS' | 'SYNTHESIS';
  /** Optional display label (e.g. "Extraction (bounding boxes)" for vision). */
  stepLabel?: string;
  model: string;
  /** User prompt (system prompt not included). Longer for extraction so full instruction is visible. */
  promptPreview: string;
  /** Model response preview. */
  responsePreview: string;
  tokenUsage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
  error?: string;
}

export interface PipelineResult {
  status: TaskStatus;
  taskId: string;
  runId?: string;
  raw_extraction: ExtractionResult;
  final_analysis: AnalysisResult & { synthesis?: SynthesisResult };
  is_verified: false;
  tokenUsage?: PipelineTokenUsage;
  /** Per-step trace for debugging and improving quality. */
  stepTrace?: StepTraceEntry[];
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
    items: extraction.items.map((e) => {
      const area = (e as { area_m2?: number }).area_m2;
      return {
        id: e.id,
        label: e.label,
        value: typeof area === 'number' && area >= 0 ? area : 0,
        unit: 'm²',
        citation_id: e.id,
      };
    }),
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
  const models = await getAIModelConfig();

  // Step 1: Vision or text extraction
  const useVisionPrompt = Boolean(params.fileUrl);
  const extractionBase = overrides?.extraction ?? (useVisionPrompt ? EXTRACTION_VISION_USER_PROMPT : 'Extract from the following source as structured JSON. For each item include: id, label, confidence_score (0-1), and coordinate_polygons if spatial. If the source is an image (floorplan/drawing), also estimate area_m2 when possible.');
  const sourceText = sourceContent ?? (params.fileUrl ? 'See attached image.' : '[No content: add fileUrl or sourceContent]');
  const extractionPrompt = useVisionPrompt ? extractionBase : `${extractionBase} Source: ${sourceText}`;
  let raw_extraction: ExtractionResult;
  const extractionModel = models.extraction;
  const usageByStep: PipelineResult['tokenUsage'] = {
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_tokens: 0,
    total_cost: undefined,
  };
  const stepTrace: StepTraceEntry[] = [];
  const pushTrace = (entry: StepTraceEntry) => stepTrace.push(entry);

  if (hasKey) {
    try {
      let imageUrlForVision = params.fileUrl;
      if (params.fileUrl && isPrivateBlobUrl(params.fileUrl)) {
        imageUrlForVision = await privateBlobToDataUrl(params.fileUrl);
      }
      const extractionSystem = imageUrlForVision ? EXTRACTION_VISION_SYSTEM : getSystemPrompt('EXTRACTION');
      const userContent = imageUrlForVision
        ? [{ type: 'text' as const, text: extractionPrompt }, { type: 'image_url' as const, image_url: { url: imageUrlForVision } }]
        : extractionPrompt;
      const messages = imageUrlForVision
        ? [{ role: 'system' as const, content: extractionSystem }, { role: 'user' as const, content: userContent }]
        : [{ role: 'system' as const, content: extractionSystem }, { role: 'user' as const, content: extractionPrompt }];
      const modelForExtraction = imageUrlForVision ? getExtractionModelForVision(extractionModel) : extractionModel;
      const { content, usage: extUsage } = await callOpenRouter({
        model: modelForExtraction,
        messages,
        max_tokens: 2048,
      });
      raw_extraction = parseExtraction(content);
      if (extUsage) {
        usageByStep.extraction = extUsage;
        usageByStep.total_prompt_tokens += extUsage.prompt_tokens;
        usageByStep.total_completion_tokens += extUsage.completion_tokens;
        usageByStep.total_tokens += extUsage.total_tokens;
        if (extUsage.cost != null) usageByStep.total_cost = (usageByStep.total_cost ?? 0) + extUsage.cost;
      }
      pushTrace({
        step: 'EXTRACTION',
        stepLabel: useVisionPrompt ? 'Extraction (bounding boxes)' : undefined,
        model: modelForExtraction,
        promptPreview: extractionPrompt.slice(0, 2000),
        responsePreview: content.slice(0, 1200),
        tokenUsage: extUsage,
      });
      appendAuditEntry(createAuditEntry({ runId, taskId, model: modelForExtraction, step: 'EXTRACTION', orgId: params.orgId, documentId }));
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const visionHint = (errMsg.includes('404') || errMsg.includes('image input') || errMsg.includes('support image'))
        ? ' Use a vision-capable model (e.g. Google Gemini 2.0 Flash, GPT-4o) in Admin → AI models for extraction.'
        : '';
      raw_extraction = stubExtraction();
      pushTrace({
        step: 'EXTRACTION',
        stepLabel: useVisionPrompt ? 'Extraction (bounding boxes)' : undefined,
        model: extractionModel,
        promptPreview: extractionPrompt.slice(0, 2000),
        responsePreview: '',
        error: errMsg + visionHint,
      });
    }
  } else {
    raw_extraction = stubExtraction();
  }

  type PythonResultItem = { id?: string; label: string; area_m2: number; volume_m3: number; verified?: boolean };
  const thickness = typeof params.libraryContext?.thickness === 'number' ? params.libraryContext.thickness : 0.2;
  let pythonResults: PythonResultItem[] | null = null;
  if (params.fileUrl && raw_extraction.items.length > 0) {
    try {
      const payload = {
        data: raw_extraction.items.map((i) => ({ id: i.id, label: i.label, area: (i as { area_m2?: number }).area_m2 ?? 0, url: params.fileUrl })),
        parameters: { thickness },
      };
      const py = await callPythonEngine<PythonResultItem[]>('/calculate', payload);
      if (py.status === 'success' && Array.isArray(py.results)) pythonResults = py.results;
    } catch {
      // continue without Python numbers
    }
  }

  // Step 2: Reasoning analysis (use Python results when available, else LLM)
  const libraryStr = Object.entries(libraryContext)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  let analysisItems: AuditItem[];
  if (pythonResults && pythonResults.length > 0) {
    analysisItems = pythonResults.map((r) => ({
      id: r.id ?? r.label,
      label: r.label ?? '',
      value: Number(r.area_m2 ?? 0),
      unit: 'm²' as const,
      citation_id: r.id ?? r.label,
      coordinate_set: undefined,
    }));
  } else {
    const analysisBase = overrides?.analysis ?? 'Given extraction: apply constants. Output a JSON array of items with: id, label, value (number), unit, citation_id. For each extracted item that has area_m2, set value to that number and unit to "m²". Preserve all area values from the extraction.';
    const analysisPrompt = `${analysisBase} Extraction: ${JSON.stringify(raw_extraction)}. Constants: ${libraryStr || 'none'}.`;
    const analysisModel = models.analysis;
    if (hasKey) {
      try {
        const analysisSystem = getSystemPrompt('ANALYSIS');
        const { content, usage: analysisUsage } = await callOpenRouter({
          model: analysisModel,
          messages: [{ role: 'system', content: analysisSystem }, { role: 'user', content: analysisPrompt }],
          max_tokens: 2048,
        });
        analysisItems = parseAnalysisItems(content);
        if (analysisUsage) {
          usageByStep.analysis = analysisUsage;
          usageByStep.total_prompt_tokens += analysisUsage.prompt_tokens;
          usageByStep.total_completion_tokens += analysisUsage.completion_tokens;
          usageByStep.total_tokens += analysisUsage.total_tokens;
          if (analysisUsage.cost != null) usageByStep.total_cost = (usageByStep.total_cost ?? 0) + analysisUsage.cost;
        }
        pushTrace({ step: 'ANALYSIS', model: analysisModel, promptPreview: analysisPrompt.slice(0, 1500), responsePreview: content.slice(0, 1200), tokenUsage: analysisUsage });
        appendAuditEntry(createAuditEntry({ runId, taskId, model: analysisModel, step: 'ANALYSIS', orgId: params.orgId, documentId }));
      } catch (e) {
        analysisItems = stubAnalysis(raw_extraction).items;
        pushTrace({ step: 'ANALYSIS', model: analysisModel, promptPreview: analysisPrompt.slice(0, 1500), responsePreview: '', error: e instanceof Error ? e.message : String(e) });
      }
    } else {
      analysisItems = stubAnalysis(raw_extraction).items;
    }
    // Fallback: if analysis returned all zeros but extraction has area_m2, use extraction areas so plans are not reported as 0 m²
    const extractionHasAreas = raw_extraction.items.some((i) => typeof (i as { area_m2?: number }).area_m2 === 'number' && (i as { area_m2: number }).area_m2 > 0);
    const analysisAllZeros = analysisItems.every((i) => Number(i.value) === 0);
    if (extractionHasAreas && analysisAllZeros) {
      analysisItems = raw_extraction.items.map((e) => {
        const area = (e as { area_m2?: number }).area_m2;
        return {
          id: e.id,
          label: e.label,
          value: typeof area === 'number' && area >= 0 ? area : 0,
          unit: 'm²' as const,
          citation_id: e.id,
          coordinate_set: undefined,
        };
      });
    }
  }

  // Step 3: Synthesis + citation audit — ensure no null/undefined values so synthesis never sees "nil"
  const normalizedItems: AuditItem[] = analysisItems.map((i) => ({
    ...i,
    value: Number(i.value ?? 0),
    label: String(i.label ?? ''),
    unit: i.unit ?? '—',
  }));
  const audit = runCitationAudit(normalizedItems, benchmarks);
  const synthesisBase = overrides?.synthesis ?? 'Format these analysis results as a short Markdown report.';
  const synthesisPrompt = `${synthesisBase} Items: ${JSON.stringify(normalizedItems)}. ${audit.criticalWarnings.length > 0 ? `Add a CRITICAL WARNING section for: ${audit.criticalWarnings.map((w) => w.message).join('; ')}` : ''}`;
  let content_md: string;
  const synthesisModel = models.synthesis;

  if (hasKey) {
    try {
      const synthesisSystem = getSystemPrompt('SYNTHESIS');
      const { content: synContent, usage: synUsage } = await callOpenRouter({
        model: synthesisModel,
        messages: [{ role: 'system', content: synthesisSystem }, { role: 'user', content: synthesisPrompt }],
        max_tokens: 2048,
      });
      content_md = synContent;
      if (synUsage) {
        usageByStep.synthesis = synUsage;
        usageByStep.total_prompt_tokens += synUsage.prompt_tokens;
        usageByStep.total_completion_tokens += synUsage.completion_tokens;
        usageByStep.total_tokens += synUsage.total_tokens;
        if (synUsage.cost != null) usageByStep.total_cost = (usageByStep.total_cost ?? 0) + synUsage.cost;
      }
      pushTrace({ step: 'SYNTHESIS', model: synthesisModel, promptPreview: synthesisPrompt.slice(0, 1500), responsePreview: synContent.slice(0, 1200), tokenUsage: synUsage });
      appendAuditEntry(createAuditEntry({ runId, taskId, model: synthesisModel, step: 'SYNTHESIS', orgId: params.orgId, documentId }));
    } catch (e) {
      content_md = formatStubReport(normalizedItems, audit);
      pushTrace({ step: 'SYNTHESIS', model: synthesisModel, promptPreview: synthesisPrompt.slice(0, 1500), responsePreview: '', error: e instanceof Error ? e.message : String(e) });
    }
  } else {
    content_md = formatStubReport(normalizedItems, audit);
  }

  const synthesis: SynthesisResult = {
    content_md,
    data_payload: normalizedItems,
    criticalWarnings: audit.criticalWarnings,
  };

  return {
    status: 'REVIEW_REQUIRED',
    taskId,
    runId,
    raw_extraction,
    final_analysis: { items: normalizedItems, synthesis },
    is_verified: false,
    tokenUsage: usageByStep.total_tokens > 0 ? usageByStep : undefined,
    stepTrace: stepTrace.length > 0 ? stepTrace : undefined,
  };
}

/** Get bbox array from a detection object; Gemini/others may use bbox, bounding_box, bounds, coordinates. */
function getBboxFromDetection(d: Record<string, unknown>): number[] | undefined {
  const raw =
    (d.bbox as number[] | undefined) ??
    (d.bounding_box as number[] | undefined) ??
    (d.bounds as number[] | undefined) ??
    (d.coordinates as number[] | undefined);
  if (!Array.isArray(raw) || raw.length < 4 || !raw.every((n) => typeof n === 'number')) return undefined;
  return raw;
}

/** Detection shape from vision extraction (docs/AI_Testing_Prompt_Template.md). Accepts detections, detection, results, regions. */
function mapDetectionsToItems(parsed: Record<string, unknown>): ExtractionResult {
  const detections =
    (parsed.detections as Record<string, unknown>[] | undefined) ??
    (parsed.detection as Record<string, unknown>[] | undefined) ??
    (parsed.results as Record<string, unknown>[] | undefined) ??
    (parsed.regions as Record<string, unknown>[] | undefined);
  if (!Array.isArray(detections)) return stubExtraction();
  const items = detections.map((d, i) => {
    const label = String(d.label ?? d.name ?? 'Unknown').trim() || `Item ${i + 1}`;
    const id = `${String(d.category ?? d.type ?? 'item').toLowerCase()}-${i + 1}`;
    const confidence = typeof d.confidence === 'number' ? d.confidence : 0.5;
    const metadata = (d.metadata && typeof d.metadata === 'object' ? d.metadata : {}) as Record<string, unknown>;
    const area_m2 = typeof (metadata as { approx_area_m2?: number }).approx_area_m2 === 'number' ? (metadata as { approx_area_m2: number }).approx_area_m2 : undefined;
    const bbox = getBboxFromDetection(d);
    return {
      id,
      label,
      confidence_score: confidence,
      coordinate_polygons: bbox,
      area_m2,
      raw: { bbox, category: d.category, metadata },
    };
  });
  return { items };
}

function parseExtraction(content: string): ExtractionResult {
  try {
    const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
    if (parsed.detections ?? parsed.detection ?? parsed.results ?? parsed.regions) return mapDetectionsToItems(parsed);
    if (Array.isArray(parsed)) return { items: parsed as ExtractionResult['items'] };
    if (Array.isArray(parsed?.items)) return parsed as unknown as ExtractionResult;
    return { items: [parsed].filter(Boolean) as ExtractionResult['items'] };
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
