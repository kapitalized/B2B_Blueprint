/**
 * AI pipeline orchestrator: PENDING → EXTRACTING → ANALYZING → SYNTHESIZING → REVIEW_REQUIRED.
 * Blueprint @04_ai_module_blueprint, @05_ai_integration_guide.
 */

import { getAIModelConfig } from './model-config';
import { getExtractionModelForVision } from './openrouter-models';
import { getSystemPrompt, EXTRACTION_VISION_SYSTEM, EXTRACTION_VISION_USER_PROMPT, PLAN_TEXT_EXTRACTION_PROMPT, PLAN_TEXT_AND_COORDINATES_PROMPT } from './base-prompts';
import { callOpenRouter, isOpenRouterConfigured } from './openrouter';
import { runCitationAudit, type AuditItem, type Benchmark } from './citation-audit';
import { createAuditEntry, appendAuditEntry } from './audit-trail';
import { getPromptOverrides } from './templates';
import { callPythonEngine } from '@/lib/python-client';
import { isPrivateBlobUrl, privateBlobToDataUrl } from '@/lib/blob';
import type { SourceSpan } from './types';
import { validateFloorplan, type RoomForValidation } from './validate-floorplan';

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
    /** From floorplan extraction (detections.metadata.length_m / width_m). */
    length_m?: number;
    width_m?: number;
  }>;
  /** Windows from vision extraction (id e.g. "Window 1", box in 0–1000, optional dimensions). */
  windows?: Array<{ id: string; label?: string; coordinate_polygons?: unknown; length_m?: number; width_m?: number }>;
  /** Doors from vision extraction (id e.g. "Door 1", box in 0–1000, optional dimensions). */
  doors?: Array<{ id: string; label?: string; coordinate_polygons?: unknown; length_m?: number; width_m?: number }>;
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
  /** Reasoning/thinking tokens when the model returns them (e.g. Gemini thinking, Anthropic reasoning). */
  reasoningPreview?: string;
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
  /** Full raw extraction response from the model (for debugging / test output). */
  rawExtractionResponse?: string;
  /** When plan text extraction ran: raw text from the prior step (room labels, dimensions). */
  planTextExtraction?: string;
  /** When plan text step returned JSON: text labels with bounding boxes for alignment. */
  planTextItems?: Array<{ label: string; box: number[] }>;
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
      const length_m = (e as { length_m?: number }).length_m;
      const width_m = (e as { width_m?: number }).width_m;
      return {
        id: e.id,
        label: e.label,
        value: typeof area === 'number' && area >= 0 ? area : 0,
        unit: 'm²',
        citation_id: e.id,
        ...(length_m != null ? { length_m } : {}),
        ...(width_m != null ? { width_m } : {}),
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

  // Step 1: Vision or text extraction. When an image is provided, always use the vision prompt (bbox 0–1000) so overlay boxes align with the drawing; template overrides apply only to text extraction.
  const useVisionPrompt = Boolean(params.fileUrl);
  const extractionBase = useVisionPrompt
    ? EXTRACTION_VISION_USER_PROMPT
    : (overrides?.extraction ?? 'Extract from the following source as structured JSON. For each item include: id, label, confidence_score (0-1), and coordinate_polygons if spatial. If the source is an image (floorplan/drawing), also estimate area_m2 when possible.');
  const sourceText = sourceContent ?? (params.fileUrl ? 'See attached image.' : '[No content: add fileUrl or sourceContent]');
  let extractionPrompt = useVisionPrompt ? extractionBase : `${extractionBase} Source: ${sourceText}`;
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
  let extractionContent = '';
  let extractionRooms: Array<Record<string, unknown>> | null = null;
  let planTextExtraction: string | undefined;
  let planTextItems: Array<{ label: string; box: number[] }> | undefined;

  if (hasKey) {
    try {
      let imageUrlForVision: string | undefined = params.fileUrl;
      if (params.fileUrl && isPrivateBlobUrl(params.fileUrl)) {
        try {
          imageUrlForVision = await privateBlobToDataUrl(params.fileUrl);
        } catch (e) {
          console.warn('[AI extraction] privateBlobToDataUrl failed:', e instanceof Error ? e.message : String(e));
          imageUrlForVision = undefined;
        }
      }
      if (imageUrlForVision && imageUrlForVision.startsWith('data:') && imageUrlForVision.length < 500) {
        console.warn('[AI extraction] Image data URL too short; possible missing image');
        imageUrlForVision = undefined;
      }
      // Optional prior step: extract visible text and coordinates from the plan for alignment
      let planText = '';
      if (imageUrlForVision && process.env.ENABLE_PLAN_TEXT_EXTRACTION !== 'false' && process.env.ENABLE_PLAN_TEXT_EXTRACTION !== '0') {
        try {
          const modelForVision = getExtractionModelForVision(extractionModel);
          const textRes = await callOpenRouter({
            model: modelForVision,
            messages: [
              {
                role: 'user' as const,
                content: [
                  { type: 'text' as const, text: PLAN_TEXT_AND_COORDINATES_PROMPT },
                  { type: 'image_url' as const, image_url: { url: imageUrlForVision } },
                ],
              },
            ],
            max_tokens: 2048,
            temperature: 0,
          });
          const raw = textRes.content;
          planText =
            typeof raw === 'string'
              ? raw.trim()
              : Array.isArray(raw)
                ? (raw as Array<{ type?: string; text?: string }>)
                    .map((p) => (p?.type === 'text' && typeof p?.text === 'string' ? p.text : ''))
                    .join('')
                    .trim()
                : String(raw ?? '').trim();
          if (planText) {
            planTextExtraction = planText;
            const parsed = parsePlanTextItems(planText);
            if (parsed.length > 0) planTextItems = parsed;
            pushTrace({
              step: 'EXTRACTION',
              stepLabel: 'Plan text extraction',
              model: modelForVision,
              promptPreview: PLAN_TEXT_AND_COORDINATES_PROMPT.slice(0, 1500),
              responsePreview: planText.slice(0, 500),
            });
            const textSummary = planTextItems?.length
              ? `Labels with positions (${planTextItems.length} items): ${planTextItems.map((t) => t.label).join(', ')}`
              : 'No text labels found (plan may be colour-block or coloured regions only). Extract each distinct coloured region bounded by walls as a room; name by position (Zone 1, Zone 2, …) in top-left order.';
            extractionPrompt = `${extractionBase}\n\n---\nPreviously extracted text from the plan (use for room names and dimensions):\n${textSummary}\n\n---\nNow output the JSON as specified above.`;
          }
        } catch (_e) {
          // optional step; continue with extraction without plan text
        }
      }
      const extractionSystem = imageUrlForVision ? EXTRACTION_VISION_SYSTEM : getSystemPrompt('EXTRACTION');
      const userContent = imageUrlForVision
        ? [{ type: 'text' as const, text: extractionPrompt }, { type: 'image_url' as const, image_url: { url: imageUrlForVision } }]
        : extractionPrompt;
      const messages = imageUrlForVision
        ? [{ role: 'system' as const, content: extractionSystem }, { role: 'user' as const, content: userContent }]
        : [{ role: 'system' as const, content: extractionSystem }, { role: 'user' as const, content: extractionPrompt }];
      const modelForExtraction = imageUrlForVision ? getExtractionModelForVision(extractionModel) : extractionModel;
      const { content: rawContent, reasoning, usage: extUsage } = await callOpenRouter({
        model: modelForExtraction,
        messages,
        max_tokens: 2048,
        temperature: 0.2,
      });
      // Normalize to string (API may return content as array of parts)
      const content =
        typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
            ? (rawContent as Array<{ type?: string; text?: string }>)
                .map((p) => (p?.type === 'text' && typeof p?.text === 'string' ? p.text : ''))
                .join('')
            : String(rawContent ?? '');
      extractionContent = content;
      let extUsageAccum = extUsage;

      // Self-correction (docs/Self_Correct_Analysis.md): validate rooms schema; if errors, retry once with feedback
      if (useVisionPrompt) {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
        const rooms = parsed.rooms as RoomForValidation[] | undefined;
        const canvas = parsed.canvas_size as { width?: number; height?: number } | undefined;
        const isRoomsSchema = Array.isArray(rooms) && rooms.length > 0 && (rooms[0] as { box_2d?: unknown })?.box_2d && canvas;
        if (isRoomsSchema) {
          const w = typeof canvas.width === 'number' && canvas.width > 0 ? canvas.width : 1000;
          const h = typeof canvas.height === 'number' && canvas.height > 0 ? canvas.height : 1000;
          const validationErrors = validateFloorplan(rooms, w, h);
          if (validationErrors.length > 0) {
            const correctionPrompt = `The previous extraction had validation errors. Output a corrected JSON with the same schema (layout_reasoning, canvas_size, rooms with name and box_2d). Fix the issues below. Return ONLY valid JSON.\n\nValidation errors:\n${validationErrors.map((e) => `- ${e}`).join('\n')}\n\nPrevious output (reference):\n${content.slice(0, 3500)}`;
            const retryMessages = [
              ...messages,
              { role: 'assistant' as const, content },
              { role: 'user' as const, content: correctionPrompt },
            ];
            try {
              const retry = await callOpenRouter({
                model: modelForExtraction,
                messages: retryMessages,
                max_tokens: 2048,
                temperature: 0.2,
              });
              const retryParsed = (() => {
                try {
                  return JSON.parse(extractJson(retry.content)) as Record<string, unknown>;
                } catch {
                  return null;
                }
              })();
              const retryRooms = retryParsed?.rooms as RoomForValidation[] | undefined;
              const retryCanvas = retryParsed?.canvas_size as { width?: number; height?: number } | undefined;
              const retryValid =
                Array.isArray(retryRooms) &&
                retryRooms.length > 0 &&
                (retryRooms[0] as { box_2d?: unknown })?.box_2d &&
                retryCanvas &&
                validateFloorplan(retryRooms, Number(retryCanvas.width) || 1000, Number(retryCanvas.height) || 1000).length === 0;
              if (retryValid) {
                extractionContent = retry.content;
              }
              if (retryValid && retry.usage) {
                extUsageAccum = {
                  prompt_tokens: (extUsageAccum?.prompt_tokens ?? 0) + retry.usage.prompt_tokens,
                  completion_tokens: (extUsageAccum?.completion_tokens ?? 0) + retry.usage.completion_tokens,
                  total_tokens: (extUsageAccum?.total_tokens ?? 0) + retry.usage.total_tokens,
                  cost: (extUsageAccum?.cost ?? 0) + (retry.usage.cost ?? 0),
                };
              }
              pushTrace({
                step: 'EXTRACTION',
                stepLabel: 'Extraction (retry after validation)',
                model: modelForExtraction,
                promptPreview: correctionPrompt.slice(0, 1500),
                responsePreview: retry.content.slice(0, 800),
                tokenUsage: retry.usage,
                error: retryValid ? undefined : `Validation failed (${validationErrors.length} errors); retry did not pass validation; kept first response.`,
              });
            } catch {
              // keep extractionContent = content
            }
          }
        }
      }

      raw_extraction = parseExtraction(extractionContent);
      // Align room names to plan text labels by position, then prefer names from raw rooms (A1).
      // raw_extraction.items are in sorted order (top-left first); rawRooms are in model order — sort rawRooms the same way so index i matches.
      if (useVisionPrompt && raw_extraction.items.length > 0) {
        try {
          const reparse = JSON.parse(extractJson(extractionContent)) as Record<string, unknown>;
          const rawRooms = (reparse.rooms ?? (reparse as { Rooms?: unknown }).Rooms) as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(rawRooms) && rawRooms.length >= raw_extraction.items.length) {
            if (planTextItems && planTextItems.length > 0) alignRoomsToTextItems(rawRooms, planTextItems);
            const rawRoomsSorted = sortRoomsByTopLeft(rawRooms);
            extractionRooms = rawRoomsSorted;
            raw_extraction.items.forEach((item, i) => {
              const r = rawRoomsSorted[i];
              const name = r?.name ?? (r as { Name?: string }).Name ?? r?.room_name ?? r?.label;
              if (name != null && String(name).trim()) item.label = String(name).trim();
            });
          }
        } catch {
          // ignore
        }
      }
      if (process.env.DEBUG_AI_EXTRACTION && raw_extraction.items.length > 0) {
        console.debug('[AI extraction] parsed labels:', raw_extraction.items.map((i) => i.label));
      }
      if (useVisionPrompt && extractionContent && raw_extraction.items.length > 0 && !extractionRooms) {
        try {
          const p = JSON.parse(extractJson(extractionContent)) as Record<string, unknown>;
          const rooms = (p.rooms ?? (p as { Rooms?: unknown }).Rooms) as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(rooms) && rooms.length >= raw_extraction.items.length) extractionRooms = sortRoomsByTopLeft(rooms);
        } catch {
          // ignore
        }
      }
      if (extUsageAccum) {
        usageByStep.extraction = extUsageAccum;
        usageByStep.total_prompt_tokens += extUsageAccum.prompt_tokens;
        usageByStep.total_completion_tokens += extUsageAccum.completion_tokens;
        usageByStep.total_tokens += extUsageAccum.total_tokens;
        if (extUsageAccum.cost != null) usageByStep.total_cost = (usageByStep.total_cost ?? 0) + extUsageAccum.cost;
      }
      pushTrace({
        step: 'EXTRACTION',
        stepLabel: useVisionPrompt ? 'Extraction (bounding boxes)' : undefined,
        model: modelForExtraction,
        promptPreview: extractionPrompt.slice(0, 2000),
        responsePreview: extractionContent.slice(0, 1200),
        reasoningPreview: reasoning?.slice(0, 2000),
        tokenUsage: extUsageAccum,
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
        data: raw_extraction.items.map((i, idx) => {
          const fromRoom = extractionRooms?.[idx];
          const label =
            (fromRoom && String((fromRoom.name ?? fromRoom.label ?? (fromRoom as { Name?: string }).Name) ?? '').trim()) ||
            (i.label && String(i.label).trim()) ||
            i.id ||
            'Room';
          return {
            id: i.id,
            label,
            area: (i as { area_m2?: number }).area_m2 ?? 0,
            url: params.fileUrl,
          };
        }),
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
        const { content, reasoning, usage: analysisUsage } = await callOpenRouter({
          model: analysisModel,
          messages: [{ role: 'system', content: analysisSystem }, { role: 'user', content: analysisPrompt }],
          max_tokens: 2048,
          temperature: 0.3,
        });
        analysisItems = parseAnalysisItems(content);
        if (analysisUsage) {
          usageByStep.analysis = analysisUsage;
          usageByStep.total_prompt_tokens += analysisUsage.prompt_tokens;
          usageByStep.total_completion_tokens += analysisUsage.completion_tokens;
          usageByStep.total_tokens += analysisUsage.total_tokens;
          if (analysisUsage.cost != null) usageByStep.total_cost = (usageByStep.total_cost ?? 0) + analysisUsage.cost;
        }
        pushTrace({ step: 'ANALYSIS', model: analysisModel, promptPreview: analysisPrompt.slice(0, 1500), responsePreview: content.slice(0, 1200), reasoningPreview: reasoning?.slice(0, 2000), tokenUsage: analysisUsage });
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
        const confidence = (e as { confidence_score?: number }).confidence_score;
        const length_m = (e as { length_m?: number }).length_m;
        const width_m = (e as { width_m?: number }).width_m;
        return {
          id: e.id,
          label: e.label,
          value: typeof area === 'number' && area >= 0 ? area : 0,
          unit: 'm²' as const,
          citation_id: e.id,
          coordinate_set: undefined,
          ...(typeof confidence === 'number' && !Number.isNaN(confidence) ? { confidence_score: confidence } : {}),
          ...(length_m != null ? { length_m } : {}),
          ...(width_m != null ? { width_m } : {}),
        };
      });
    }
  }

  // Step 3: Synthesis + citation audit — ensure no null/undefined values so synthesis never sees "nil"
  let normalizedItems: AuditItem[] = analysisItems.map((i) => ({
    ...i,
    value: Number(i.value ?? 0),
    label: String(i.label ?? ''),
    unit: i.unit ?? '—',
  }));

  // When extraction has data, prefer extraction labels and areas so report never shows generic "Room" / 0 when extraction had real names and approx_area_m2
  const extItems = raw_extraction.items;
  if (extItems.length > 0) {
    const byId = new Map<string, { label: string; value: number; confidence_score?: number; length_m?: number; width_m?: number }>();
    for (const e of extItems) {
      const area = (e as { area_m2?: number }).area_m2;
      const val = typeof area === 'number' && !Number.isNaN(area) && area >= 0 ? area : 0;
      const lab = (e.label && String(e.label).trim()) || e.id || '';
      byId.set(String(e.id ?? ''), {
        label: lab,
        value: val,
        confidence_score: (e as { confidence_score?: number }).confidence_score,
        length_m: (e as { length_m?: number }).length_m,
        width_m: (e as { width_m?: number }).width_m,
      });
    }
    normalizedItems = normalizedItems.map((item, idx) => {
      const byIndex = extItems[idx];
      const areaFromIndex = byIndex && typeof (byIndex as { area_m2?: number }).area_m2 === 'number' ? (byIndex as { area_m2: number }).area_m2 : null;
      const fromId = item.id ? byId.get(String(item.id)) : undefined;
      const fromCitation = item.citation_id ? byId.get(String(item.citation_id)) : undefined;
      const value = areaFromIndex ?? fromId?.value ?? fromCitation?.value;
      const fromExtractionRoom = extractionRooms?.[idx];
      const extLabel =
        (fromExtractionRoom && String((fromExtractionRoom.name ?? fromExtractionRoom.label ?? (fromExtractionRoom as { Name?: string }).Name) ?? '').trim()) ||
        ((byIndex?.label && String(byIndex.label).trim()) ? String(byIndex.label).trim() : null) ||
        fromId?.label ||
        fromCitation?.label;
      const conf = (byIndex && areaFromIndex != null ? (byIndex as { confidence_score?: number }).confidence_score : undefined) ?? fromId?.confidence_score ?? fromCitation?.confidence_score;
      const length_m = (byIndex as { length_m?: number })?.length_m ?? fromId?.length_m ?? fromCitation?.length_m;
      const width_m = (byIndex as { width_m?: number })?.width_m ?? fromId?.width_m ?? fromCitation?.width_m;
      const hasBetterLabel = extLabel && extLabel !== item.label;
      const hasArea = value != null && value > 0;
      if (hasBetterLabel || hasArea) {
        return {
          ...item,
          ...(extLabel ? { label: extLabel } : {}),
          ...(hasArea ? { value, unit: 'm²' as const } : {}),
          ...(conf != null ? { confidence_score: conf } : {}),
          ...(length_m != null ? { length_m } : {}),
          ...(width_m != null ? { width_m } : {}),
        };
      }
      return item;
    });
  }
  const audit = runCitationAudit(normalizedItems, benchmarks);
  const synthesisBase = overrides?.synthesis ?? 'Format these analysis results as a short Markdown report.';
  const synthesisPrompt = `${synthesisBase} Items: ${JSON.stringify(normalizedItems)}. ${audit.criticalWarnings.length > 0 ? `Add a CRITICAL WARNING section for: ${audit.criticalWarnings.map((w) => w.message).join('; ')}` : ''}`;
  let content_md: string;
  const synthesisModel = models.synthesis;

  if (hasKey) {
    try {
      const synthesisSystem = getSystemPrompt('SYNTHESIS');
      const { content: synContent, reasoning: synReasoning, usage: synUsage } = await callOpenRouter({
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
      pushTrace({ step: 'SYNTHESIS', model: synthesisModel, promptPreview: synthesisPrompt.slice(0, 1500), responsePreview: synContent.slice(0, 1200), reasoningPreview: synReasoning?.slice(0, 2000), tokenUsage: synUsage });
      appendAuditEntry(createAuditEntry({ runId, taskId, model: synthesisModel, step: 'SYNTHESIS', orgId: params.orgId, documentId }));
    } catch (e) {
      content_md = formatStubReport(normalizedItems, audit);
      pushTrace({ step: 'SYNTHESIS', model: synthesisModel, promptPreview: synthesisPrompt.slice(0, 1500), responsePreview: '', error: e instanceof Error ? e.message : String(e) });
    }
  } else {
    content_md = formatStubReport(normalizedItems, audit);
  }

  // Append windows/doors by room and sense check (from raw extraction)
  content_md = appendFloorplanSections(content_md, raw_extraction);

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
    rawExtractionResponse: extractionContent || undefined,
    planTextExtraction,
    planTextItems,
  };
}

/** Parse plan text step response into textItems with label and box. Returns [] if not valid JSON. */
function parsePlanTextItems(raw: string): Array<{ label: string; box: number[] }> {
  try {
    const s = raw.trim().replace(/^```\s*\w*\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(s) as { textItems?: Array<{ label?: string; box?: unknown }> };
    const arr = parsed?.textItems;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((t) => {
        const label = typeof t?.label === 'string' ? t.label.trim() : '';
        const b = t?.box;
        if (!Array.isArray(b) || b.length < 4) return null;
        const box = b.slice(0, 4).map((n) => (typeof n === 'number' ? n : Number(n)));
        if (box.some((n) => Number.isNaN(n))) return null;
        return label ? { label, box } : null;
      })
      .filter((t): t is { label: string; box: number[] } => t != null);
  } catch {
    return [];
  }
}

/** Sort rooms by top-left then left-to-right (y_min, x_min) — same order as mapRoomsToItems so indices match. */
function sortRoomsByTopLeft(rooms: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return [...rooms].sort((a, b) => {
    const boxA = (a.box_2d ?? a.box2d ?? a.bbox) as number[] | undefined;
    const boxB = (b.box_2d ?? b.box2d ?? b.bbox) as number[] | undefined;
    const yA = Array.isArray(boxA) && boxA.length >= 2 ? Number(boxA[1]) : 0;
    const yB = Array.isArray(boxB) && boxB.length >= 2 ? Number(boxB[1]) : 0;
    if (yA !== yB) return yA - yB;
    const xA = Array.isArray(boxA) && boxA.length >= 1 ? Number(boxA[0]) : 0;
    const xB = Array.isArray(boxB) && boxB.length >= 1 ? Number(boxB[0]) : 0;
    return xA - xB;
  });
}

/** Align room names to text items by position: if a text box center lies inside a room box, use that label. */
function alignRoomsToTextItems(
  rooms: Array<Record<string, unknown>>,
  textItems: Array<{ label: string; box: number[] }>
): void {
  for (const room of rooms) {
    const box2d = (room.box_2d ?? room.box2d ?? room.bbox) as number[] | undefined;
    if (!Array.isArray(box2d) || box2d.length < 4) continue;
    const [rx1, ry1, rx2, ry2] = box2d.map((n) => (typeof n === 'number' ? n : Number(n)));
    if (Number.isNaN(rx1 + ry1 + rx2 + ry2) || rx1 >= rx2 || ry1 >= ry2) continue;
    const inside: Array<{ label: string; area: number }> = [];
    for (const t of textItems) {
      const [tx1, ty1, tx2, ty2] = t.box;
      const cx = (tx1 + tx2) / 2;
      const cy = (ty1 + ty2) / 2;
      if (cx >= rx1 && cx <= rx2 && cy >= ry1 && cy <= ry2) {
        const area = (tx2 - tx1) * (ty2 - ty1);
        inside.push({ label: t.label, area });
      }
    }
    if (inside.length > 0) {
      // Prefer room-like labels (longer, not just a dimension); else pick largest text area
      const dimensionLike = /^[\d.,]+\s*m$/i;
      const roomLike = inside.filter((x) => !dimensionLike.test(x.label) && x.label.length > 2);
      const pick = roomLike.length > 0 ? roomLike.sort((a, b) => b.area - a.area)[0] : inside.sort((a, b) => b.area - a.area)[0];
      room.name = pick.label;
    }
  }
}

/** Get bbox array from a detection object; Gemini/others may use bbox, bounding_box, bounds, coordinates. Coerces string numbers. */
function getBboxFromDetection(d: Record<string, unknown>): number[] | undefined {
  const raw =
    (d.bbox as unknown) ??
    (d.bounding_box as unknown) ??
    (d.bounds as unknown) ??
    (d.coordinates as unknown);
  if (!Array.isArray(raw) || raw.length < 4) return undefined;
  const nums = raw.map((n) => (typeof n === 'number' ? n : Number(n)));
  if (nums.some((n) => Number.isNaN(n))) return undefined;
  return nums;
}

/** Normalize an array of items with box_2d (e.g. windows, doors) to 0–1000 coords; derive length_m/width_m from pixel size. */
function mapBoxListToNormalized(
  arr: Array<Record<string, unknown>> | undefined,
  canvas: { width?: number; height?: number } | undefined,
  defaultPrefix: string
): Array<{ id: string; label?: string; coordinate_polygons?: number[]; length_m?: number; width_m?: number }> {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const w = typeof canvas?.width === 'number' && canvas.width > 0 ? canvas.width : 1000;
  const h = typeof canvas?.height === 'number' && canvas.height > 0 ? canvas.height : 1000;
  const scaleX = 1000 / w;
  const scaleY = 1000 / h;
  const canvasArea = w * h;
  const meterScale = canvasArea > 0 ? Math.sqrt(150 / canvasArea) : 0;
  return arr.map((r, i) => {
    const idRaw = r.id ?? (r as { Id?: string }).Id;
    const id = (typeof idRaw === 'string' && idRaw.trim()) ? String(idRaw).trim() : `${defaultPrefix} ${i + 1}`;
    const labelRaw = r.name ?? r.label ?? (r as { Name?: string }).Name;
    const label = (labelRaw != null && String(labelRaw).trim()) ? String(labelRaw).trim() : undefined;
    const rawBox = (r.box_2d ?? r.box2d ?? r.bbox) as number[] | undefined;
    const box2d = Array.isArray(rawBox) && rawBox.length >= 4 ? rawBox.map((n) => (typeof n === 'number' ? n : Number(n))) : null;
    let bbox: number[] | undefined;
    let length_m: number | undefined;
    let width_m: number | undefined;
    if (box2d && !box2d.some((n) => Number.isNaN(n))) {
      const [xMin, yMin, xMax, yMax] = box2d;
      bbox = [
        Math.round(yMin * scaleY),
        Math.round(xMin * scaleX),
        Math.round(yMax * scaleY),
        Math.round(xMax * scaleX),
      ];
      if (meterScale > 0) {
        const pixelW = xMax - xMin;
        const pixelH = yMax - yMin;
        length_m = Math.round(pixelW * meterScale * 100) / 100;
        width_m = Math.round(pixelH * meterScale * 100) / 100;
      }
    }
    return { id, ...(label ? { label } : {}), coordinate_polygons: bbox, ...(length_m != null ? { length_m } : {}), ...(width_m != null ? { width_m } : {}) };
  });
}

/**
 * Schema: layout_reasoning, canvas_size { width, height }, rooms[] { name, box_2d: [x_min, y_min, x_max, y_max], connections?, metadata? }.
 * Converts pixel box_2d to normalized [ymin, xmin, ymax, xmax] in 0–1000 for overlay.
 */
function mapRoomsToItems(parsed: Record<string, unknown>): ExtractionResult {
  const rooms = (parsed.rooms ?? (parsed as { Rooms?: unknown }).Rooms) as Array<Record<string, unknown>> | undefined;
  const canvas = (parsed.canvas_size ?? (parsed as { canvasSize?: unknown }).canvasSize) as { width?: number; height?: number } | undefined;
  if (!Array.isArray(rooms) || rooms.length === 0) return stubExtraction();
  // Sort by top-left then left-to-right by row (y_min then x_min) so Space 1, 2, ... are consistent across runs
  const sortedRooms = [...rooms].sort((a, b) => {
    const boxA = (a.box_2d ?? a.box2d ?? a.bbox) as number[] | undefined;
    const boxB = (b.box_2d ?? b.box2d ?? b.bbox) as number[] | undefined;
    const yA = Array.isArray(boxA) && boxA.length >= 2 ? Number(boxA[1]) : 0;
    const yB = Array.isArray(boxB) && boxB.length >= 2 ? Number(boxB[1]) : 0;
    if (yA !== yB) return yA - yB;
    const xA = Array.isArray(boxA) && boxA.length >= 1 ? Number(boxA[0]) : 0;
    const xB = Array.isArray(boxB) && boxB.length >= 1 ? Number(boxB[0]) : 0;
    return xA - xB;
  });
  const w = typeof canvas?.width === 'number' && canvas.width > 0 ? canvas.width : 1000;
  const h = typeof canvas?.height === 'number' && canvas.height > 0 ? canvas.height : 1000;
  const scaleX = 1000 / w;
  const scaleY = 1000 / h;
  const items = sortedRooms.map((r, i) => {
    const nameRaw = r.name ?? (r as { Name?: string }).Name ?? r.room_name ?? r.label ?? (r as { title?: string }).title;
    const name = (nameRaw != null && String(nameRaw).trim()) ? String(nameRaw).trim() : `Room ${i + 1}`;
    const id = `Space ${i + 1}`;
    const rawBox = (r.box_2d ?? r.box2d ?? r.bbox) as number[] | undefined;
    const box2d = Array.isArray(rawBox) && rawBox.length >= 4
      ? rawBox.map((n) => (typeof n === 'number' ? n : Number(n)))
      : null;
    let bbox: number[] | undefined;
    if (box2d && !box2d.some((n) => Number.isNaN(n))) {
      const xMin = box2d[0];
      const yMin = box2d[1];
      const xMax = box2d[2];
      const yMax = box2d[3];
      const ymin = Math.round(yMin * scaleY);
      const xmin = Math.round(xMin * scaleX);
      const ymax = Math.round(yMax * scaleY);
      const xmax = Math.round(xMax * scaleX);
      bbox = [ymin, xmin, ymax, xmax];
    }
    const metadata = (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, unknown>;
    const meta = metadata as { approx_area_m2?: unknown; length_m?: unknown; width_m?: unknown };
    let area_m2: number | undefined;
    const areaRaw = meta.approx_area_m2;
    const areaNum = typeof areaRaw === 'number' ? areaRaw : Number(areaRaw);
    if (Number.isFinite(areaNum) && areaNum > 0) {
      area_m2 = areaNum;
    } else if (box2d && !box2d.some((n) => Number.isNaN(n)) && w > 0 && h > 0) {
      const pixelArea = (box2d[2] - box2d[0]) * (box2d[3] - box2d[1]);
      const canvasArea = w * h;
      if (canvasArea > 0 && pixelArea > 0) {
        area_m2 = Math.round((pixelArea / canvasArea) * 150 * 100) / 100;
      }
    }
    const lengthRaw = meta.length_m;
    const lengthNum = typeof lengthRaw === 'number' ? lengthRaw : Number(lengthRaw);
    let length_m = Number.isFinite(lengthNum) && lengthNum > 0 ? lengthNum : undefined;
    const widthRaw = meta.width_m;
    const widthNum = typeof widthRaw === 'number' ? widthRaw : Number(widthRaw);
    let width_m = Number.isFinite(widthNum) && widthNum > 0 ? widthNum : undefined;
    // When model doesn't return dimensions, derive approximate length_m/width_m from box_2d (same scale as area)
    if ((length_m == null || width_m == null) && box2d && w > 0 && h > 0) {
      const canvasArea = w * h;
      const scale = canvasArea > 0 ? Math.sqrt(150 / canvasArea) : 0;
      if (scale > 0) {
        const pixelW = box2d[2] - box2d[0];
        const pixelH = box2d[3] - box2d[1];
        const derivedLength = Math.round(pixelW * scale * 100) / 100;
        const derivedWidth = Math.round(pixelH * scale * 100) / 100;
        if (length_m == null) length_m = derivedLength > 0 ? derivedLength : undefined;
        if (width_m == null) width_m = derivedWidth > 0 ? derivedWidth : undefined;
      }
    }
    return {
      id,
      label: name,
      confidence_score: 0.95,
      coordinate_polygons: bbox,
      area_m2,
      length_m,
      width_m,
      raw: { bbox, category: 'room', metadata, connections: r.connections },
    };
  });
  // Consecutive numbers for duplicate room types: Bath → Bath 1, Bath 2; Bedroom → Bedroom 1, Bedroom 2
  const labelCount = new Map<string, number>();
  for (const it of items) {
    const base = it.label;
    const n = (labelCount.get(base) ?? 0) + 1;
    labelCount.set(base, n);
  }
  const runIndex = new Map<string, number>();
  const itemsWithNumberedLabels = items.map((it) => {
    const base = it.label;
    const count = labelCount.get(base) ?? 1;
    if (count <= 1) return it;
    const idx = (runIndex.get(base) ?? 0) + 1;
    runIndex.set(base, idx);
    return { ...it, label: `${base} ${idx}` };
  });
  return { items: itemsWithNumberedLabels };
}

/** Detection shape from vision extraction. Accepts detections, detection, results, regions, rooms (legacy bbox), objects. */
function mapDetectionsToItems(parsed: Record<string, unknown>): ExtractionResult {
  const detections =
    (parsed.detections as Record<string, unknown>[] | undefined) ??
    (parsed.detection as Record<string, unknown>[] | undefined) ??
    (parsed.results as Record<string, unknown>[] | undefined) ??
    (parsed.regions as Record<string, unknown>[] | undefined) ??
    (parsed.rooms as Record<string, unknown>[] | undefined) ??
    (parsed.objects as Record<string, unknown>[] | undefined);
  if (!Array.isArray(detections)) return stubExtraction();
  const items = detections.map((d, i) => {
    const label = String(d.label ?? d.name ?? 'Unknown').trim() || `Item ${i + 1}`;
    const id = `${String(d.category ?? d.type ?? 'item').toLowerCase()}-${i + 1}`;
    const confidenceRaw = (d.confidence ?? (d as { confidence_score?: unknown }).confidence_score) as unknown;
    const confidenceNum = typeof confidenceRaw === 'number' ? confidenceRaw : Number(confidenceRaw);
    const confidence = Number.isFinite(confidenceNum) ? confidenceNum : 0.5;
    const metadata = (d.metadata && typeof d.metadata === 'object' ? d.metadata : {}) as Record<string, unknown>;
    const meta = metadata as { approx_area_m2?: unknown; length_m?: unknown; width_m?: unknown };
    const areaRaw = meta.approx_area_m2;
    const areaNum = typeof areaRaw === 'number' ? areaRaw : Number(areaRaw);
    const area_m2 = Number.isFinite(areaNum) && areaNum > 0 ? areaNum : undefined;
    const lengthRaw = meta.length_m;
    const lengthNum = typeof lengthRaw === 'number' ? lengthRaw : Number(lengthRaw);
    const length_m = Number.isFinite(lengthNum) && lengthNum > 0 ? lengthNum : undefined;
    const widthRaw = meta.width_m;
    const widthNum = typeof widthRaw === 'number' ? widthRaw : Number(widthRaw);
    const width_m = Number.isFinite(widthNum) && widthNum > 0 ? widthNum : undefined;
    const bbox = getBboxFromDetection(d);
    return {
      id,
      label,
      confidence_score: confidence,
      coordinate_polygons: bbox,
      area_m2,
      length_m,
      width_m,
      raw: { bbox, category: d.category, metadata },
    };
  });
  return { items };
}

function parseExtraction(content: string): ExtractionResult {
  try {
    const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
    const rooms = (parsed.rooms ?? (parsed as { Rooms?: unknown }).Rooms) as Array<Record<string, unknown>> | undefined;
    const canvas = parsed.canvas_size ?? (parsed as { canvasSize?: unknown }).canvasSize;
    const first = Array.isArray(rooms) && rooms.length > 0 ? (rooms[0] as Record<string, unknown>) : null;
    const hasBox = first && (first.box_2d ?? first.box2d ?? (Array.isArray(first.bbox) && first.bbox.length >= 4));
    if (Array.isArray(rooms) && rooms.length > 0 && hasBox && canvas) {
      const full = { ...parsed, rooms, canvas_size: canvas };
      const result = mapRoomsToItems(full);
      const canvasObj = canvas as { width?: number; height?: number };
      result.windows = mapBoxListToNormalized((parsed.windows ?? (parsed as { Windows?: unknown }).Windows) as Array<Record<string, unknown>> | undefined, canvasObj, 'Window');
      result.doors = mapBoxListToNormalized((parsed.doors ?? (parsed as { Doors?: unknown }).Doors) as Array<Record<string, unknown>> | undefined, canvasObj, 'Door');
      return result;
    }
    // Legacy: detections/detection/results/regions/rooms/objects with bbox
    if (parsed.detections ?? parsed.detection ?? parsed.results ?? parsed.regions ?? parsed.rooms ?? parsed.objects) return mapDetectionsToItems(parsed);
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
    return arr.map((x: unknown) => {
      const item = x as AuditItem & { confidence_score?: number; length_m?: number; width_m?: number };
      const conf = item.confidence_score;
      const length_m = item.length_m;
      const width_m = item.width_m;
      return {
        id: String(item.id ?? ''),
        label: String(item.label ?? ''),
        value: Number(item.value ?? 0),
        unit: item.unit,
        citation_id: item.citation_id,
        coordinate_set: item.coordinate_set,
        ...(typeof conf === 'number' && !Number.isNaN(conf) ? { confidence_score: conf } : {}),
        ...(length_m != null && typeof length_m === 'number' ? { length_m } : {}),
        ...(width_m != null && typeof width_m === 'number' ? { width_m } : {}),
      };
    });
  } catch {
    return [];
  }
}

function extractJson(text: string): string {
  if (typeof text !== 'string') return '';
  let s = text.trim();
  // Strip markdown code fences so we get clean JSON (handles ```json\n and trailing ```)
  if (/^```\s*\w*\s*/i.test(s)) s = s.replace(/^```\s*\w*\s*/i, '');
  if (/\s*```\s*$/.test(s)) s = s.replace(/\s*```\s*$/, '');
  s = s.trim();
  // Use the leftmost of { or [ as root so we extract the whole object {} not the first array "rooms": [...]
  const iObj = s.indexOf('{');
  const iArr = s.indexOf('[');
  const start = iObj >= 0 && (iArr < 0 || iObj < iArr) ? iObj : iArr;
  if (start < 0) return text;
  const open = s[start];
  const close = open === '[' ? ']' : '}';
  let depth = 1;
  let i = start + 1;
  const len = s.length;
  while (i < len && depth > 0) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < len && s[i] !== q) {
        if (s[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) depth--;
    i++;
  }
  const end = depth === 0 ? i : (close === ']' ? s.lastIndexOf(']') + 1 : s.lastIndexOf('}') + 1);
  if (end > start) return s.slice(start, end);
  return text;
}

/** Get [ymin, xmin, ymax, xmax] from an extraction item/window/door. */
function getBboxFromExtractionItem(o: { coordinate_polygons?: unknown; raw?: unknown }): number[] | null {
  const raw = o.coordinate_polygons ?? (o.raw as { bbox?: unknown } | undefined)?.bbox;
  if (!Array.isArray(raw) || raw.length < 4) return null;
  const nums = raw.map((n) => (typeof n === 'number' ? n : Number(n)));
  if (nums.some((n) => Number.isNaN(n))) return null;
  return nums as number[];
}

/** Associate each window and door to the room that contains its centroid (0–1000 bbox). */
function associateWindowsDoorsToRooms(extraction: ExtractionResult): {
  byRoom: Map<string, { windows: Array<{ id: string; label?: string; length_m?: number; width_m?: number }>; doors: Array<{ id: string; label?: string; length_m?: number; width_m?: number }> }>;
  unassignedWindows: string[];
  unassignedDoors: string[];
} {
  const byRoom = new Map<string, { windows: Array<{ id: string; label?: string; length_m?: number; width_m?: number }>; doors: Array<{ id: string; label?: string; length_m?: number; width_m?: number }> }>();
  const unassignedWindows: string[] = [];
  const unassignedDoors: string[] = [];
  const items = extraction.items ?? [];
  const windows = extraction.windows ?? [];
  const doors = extraction.doors ?? [];
  for (const it of items) {
    byRoom.set(it.id, { windows: [], doors: [] });
  }
  function findRoomForCentroid(cy: number, cx: number): string | undefined {
    let best: string | undefined;
    let bestArea = Infinity;
    for (const it of items) {
      const b = getBboxFromExtractionItem(it);
      if (!b) continue;
      const [ymin, xmin, ymax, xmax] = b;
      if (cy >= ymin && cy <= ymax && cx >= xmin && cx <= xmax) {
        const area = (ymax - ymin) * (xmax - xmin);
        if (area < bestArea) {
          bestArea = area;
          best = it.id;
        }
      }
    }
    return best;
  }
  for (const w of windows) {
    const b = getBboxFromExtractionItem(w as { coordinate_polygons?: unknown });
    if (!b) {
      unassignedWindows.push(w.id);
      continue;
    }
    const cy = (b[0] + b[2]) / 2;
    const cx = (b[1] + b[3]) / 2;
    const roomId = findRoomForCentroid(cy, cx);
    if (roomId) {
      const r = byRoom.get(roomId)!;
      r.windows.push({ id: w.id, label: w.label, length_m: w.length_m, width_m: w.width_m });
    } else {
      unassignedWindows.push(w.id);
    }
  }
  for (const d of doors) {
    const b = getBboxFromExtractionItem(d as { coordinate_polygons?: unknown });
    if (!b) {
      unassignedDoors.push(d.id);
      continue;
    }
    const cy = (b[0] + b[2]) / 2;
    const cx = (b[1] + b[3]) / 2;
    const roomId = findRoomForCentroid(cy, cx);
    if (roomId) {
      const r = byRoom.get(roomId)!;
      r.doors.push({ id: d.id, label: d.label, length_m: d.length_m, width_m: d.width_m });
    } else {
      unassignedDoors.push(d.id);
    }
  }
  return { byRoom, unassignedWindows, unassignedDoors };
}

function formatWindowsDoorsByRoom(extraction: ExtractionResult): string {
  const { byRoom } = associateWindowsDoorsToRooms(extraction);
  const items = extraction.items ?? [];
  if (items.length === 0) return '';
  let md = '### Windows and doors by space\n\n';
  for (const it of items) {
    const r = byRoom.get(it.id);
    const wins = r?.windows ?? [];
    const drs = r?.doors ?? [];
    md += `**${it.label ?? it.id}**\n`;
    for (const w of wins) {
      const dim = w.length_m != null && w.width_m != null ? ` ${w.length_m}m × ${w.width_m}m` : '';
      md += `- ${w.id}${dim}\n`;
    }
    for (const d of drs) {
      const dim = d.length_m != null && d.width_m != null ? ` ${d.length_m}m × ${d.width_m}m` : '';
      md += `- ${d.id}${dim}\n`;
    }
    if (wins.length === 0 && drs.length === 0) md += '- (none)\n';
    md += '\n';
  }
  return md.trimEnd();
}

function formatSenseCheck(extraction: ExtractionResult): string {
  const { byRoom } = associateWindowsDoorsToRooms(extraction);
  const items = extraction.items ?? [];
  const spacesWithNoDoor: string[] = [];
  const spacesWithWindows: string[] = [];
  const spacesWithNoWindows: string[] = [];
  for (const it of items) {
    const r = byRoom.get(it.id);
    const doorCount = r?.doors?.length ?? 0;
    const windowCount = r?.windows?.length ?? 0;
    if (doorCount === 0) spacesWithNoDoor.push(`${it.label ?? it.id} (${it.id})`);
    if (windowCount > 0) spacesWithWindows.push(`${it.label ?? it.id} (${it.id})`);
    else spacesWithNoWindows.push(`${it.label ?? it.id} (${it.id})`);
  }
  let md = '### Sense check\n\n';
  md += `- **Does every space have at least one door?** ${spacesWithNoDoor.length === 0 ? 'Yes.' : `No. Spaces without a door: ${spacesWithNoDoor.join(', ')}.`}\n`;
  md += `- **Spaces with windows:** ${spacesWithWindows.length > 0 ? spacesWithWindows.join(', ') : 'None identified.'}\n`;
  md += `- **Spaces with no windows:** ${spacesWithNoWindows.join(', ')}\n`;
  return md;
}

function appendFloorplanSections(contentMd: string, extraction: ExtractionResult): string {
  const hasSpaces = (extraction.items?.length ?? 0) > 0;
  const hasWindowsOrDoors = (extraction.windows?.length ?? 0) > 0 || (extraction.doors?.length ?? 0) > 0;
  if (!hasSpaces || !hasWindowsOrDoors) return contentMd;
  const byRoom = formatWindowsDoorsByRoom(extraction);
  const sense = formatSenseCheck(extraction);
  return contentMd + '\n\n' + byRoom + '\n\n' + sense;
}

function formatStubReport(
  items: AuditItem[],
  audit: { criticalWarnings: Array<{ message: string }> }
): string {
  const hasConfidence = items.some((i) => i.confidence_score != null);
  const hasLengths = items.some((i) => i.length_m != null || i.width_m != null);
  const parts = ['Item', 'Value', 'Unit'];
  if (hasConfidence) parts.push('Confidence');
  if (hasLengths) parts.push('Length (m)', 'Width (m)');
  const sep = '| ' + parts.map(() => '---').join(' | ') + ' |\n';
  const header = '| ' + parts.join(' | ') + ' |\n' + sep;
  let md = '### Analysis Report\n\n' + header;
  for (const i of items) {
    const row: string[] = [i.label, String(i.value), i.unit ?? '—'];
    if (hasConfidence) row.push(i.confidence_score != null ? `${Math.round((i.confidence_score as number) * 100)}%` : '—');
    if (hasLengths) {
      row.push(i.length_m != null ? String(i.length_m) : '—');
      row.push(i.width_m != null ? String(i.width_m) : '—');
    }
    md += '| ' + row.join(' | ') + ' |\n';
  }
  if (audit.criticalWarnings.length > 0) {
    md += '\n**CRITICAL WARNING**\n\n';
    for (const w of audit.criticalWarnings) md += `- ${w.message}\n`;
  }
  return md;
}
