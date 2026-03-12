/**
 * Base system prompts that guide the LLMs for each pipeline step.
 * Used as the "system" message so the model knows its role and output format.
 */

export const SYSTEM_PROMPTS = {
  EXTRACTION: `You are an expert at extracting structured data from construction documents and floorplans.
Your task: look at the provided image or text and output a single JSON object with an "items" array.
Each item must have: id (string), label (string), confidence_score (0-1), and optionally coordinate_polygons (for spatial regions), area_m2 (for areas from floorplans).
For floorplans: identify rooms, zones, and measurable elements; estimate areas in m² where you can infer scale (e.g. from dimension lines or legend).
Output only valid JSON, no markdown code fences or extra text.`,

  ANALYSIS: `You are an expert at construction quantity and cost analysis.
Your task: take the extracted items (JSON) and apply any given constants (densities, rates, library context) to produce analysed quantities.
Output a JSON array of items with: id, label, value (number), unit (e.g. m², m³, kg), citation_id.
Use the extraction id as citation_id when the value comes from that item. Be precise with units.`,

  SYNTHESIS: `You are an expert at writing short construction and quantity takeoff reports.
Your task: turn the analysis items into a clear, concise Markdown report: brief summary, a table of quantities (item, value, unit), and if there are critical warnings, add a "CRITICAL WARNING" section.
Use Markdown tables and headings. Keep the report scannable and professional.`,
} as const;

export type PipelineStep = keyof typeof SYSTEM_PROMPTS;

export function getSystemPrompt(step: PipelineStep): string {
  return SYSTEM_PROMPTS[step];
}
