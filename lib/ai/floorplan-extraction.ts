/**
 * Floorplan extraction provider switcher.
 * Use HF when token (HUGGINGFACE_HUB_TOKEN or HF_TOKEN) is set, unless USE_HF_FLOORPLAN_EXTRACTION=false.
 *
 * This keeps HF as a separate module so fallback to the previous approach is trivial
 * (set USE_HF_FLOORPLAN_EXTRACTION=false or unset the token).
 */

import { runFloorplanExtractionHF, isHFExtractionConfigured } from './floorplan-extraction-hf';

export type FloorplanExtractionProvider = 'huggingface' | 'openrouter';

/** Shape compatible with ExtractionResult from the orchestrator (no circular import). */
export interface FloorplanExtractionResult {
  items: Array<{
    id: string;
    label: string;
    confidence_score: number;
    coordinate_polygons?: number[];
    area_m2?: number;
    length_m?: number;
    width_m?: number;
  }>;
  windows?: Array<{ id: string; label?: string; coordinate_polygons?: unknown }>;
  doors?: Array<{ id: string; label?: string; coordinate_polygons?: unknown }>;
}

export interface FloorplanExtractionOutcome {
  rawContent: string;
  raw_extraction: FloorplanExtractionResult;
  provider: FloorplanExtractionProvider;
}

/** Result when HF is not configured. */
export type HFNotConfigured = { configured: false };

/** Result when HF was tried and succeeded. */
export type HFSuccess = { configured: true; success: true; outcome: FloorplanExtractionOutcome };

/** Result when HF was tried and failed (error message for trace). */
export type HFFailed = { configured: true; success: false; error: string };

export type FloorplanExtractionHFResult = HFNotConfigured | HFSuccess | HFFailed;

/**
 * Run floorplan extraction via the Hugging Face model if enabled and configured.
 * Returns { configured: false } when HF is disabled or token missing.
 * Returns { configured: true, success: true, outcome } on success, or { configured: true, success: false, error } on API failure so the orchestrator can log why it fell back.
 */
export async function runFloorplanExtractionWithHF(
  imageDataUrl: string
): Promise<FloorplanExtractionHFResult> {
  if (!isHFExtractionConfigured()) {
    return { configured: false };
  }
  try {
    const result = await runFloorplanExtractionHF(imageDataUrl);
    const raw_extraction: FloorplanExtractionResult = {
      items: result.items.map((it) => ({
        id: it.id,
        label: it.label,
        confidence_score: it.confidence_score,
        coordinate_polygons: it.coordinate_polygons,
        area_m2: it.area_m2,
        length_m: it.length_m,
        width_m: it.width_m,
      })),
      windows: [],
      doors: [],
    };
    return {
      configured: true,
      success: true,
      outcome: {
        rawContent: result.rawContent,
        raw_extraction,
        provider: 'huggingface',
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[floorplan-extraction] HF extraction failed, fallback to OpenRouter:', msg);
    return { configured: true, success: false, error: msg };
  }
}

export { isHFExtractionConfigured };
