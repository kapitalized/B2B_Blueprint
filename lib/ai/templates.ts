/**
 * Templates (recommendation 7): per doc type (e.g. financial memo vs takeoff);
 * prefill prompts in the orchestrator.
 */

import type { ReportTemplate } from './types';

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'financial_memo',
    docType: 'financial_memo',
    name: 'Financial memo',
    promptOverrides: {
      extraction: 'Extract financial figures, dates, and key terms as structured JSON.',
      analysis: 'Apply standard financial ratios and highlight anomalies.',
      synthesis: 'Produce a short executive summary and a table of key figures.',
    },
    defaultBenchmarks: [],
  },
  {
    id: 'takeoff',
    docType: 'takeoff',
    name: 'Floorplan / quantity takeoff',
    promptOverrides: {
      extraction: 'From this floorplan or drawing: extract every measurable element (rooms, zones, walls, slabs, openings). For each item give id, label, confidence_score (0-1), area_m2 where you can estimate from scale or dimensions, and coordinate_polygons if you can describe regions. Prefer standard construction labels (e.g. "Living area", "Kitchen", "Wall type A"). Output valid JSON with an "items" array only.',
      analysis: 'Using the extracted items and any constants provided: compute quantities (areas in m², volumes in m³ if thickness is given). Apply density/rate constants from the library when present. Output a JSON array with id, label, value, unit, citation_id.',
      synthesis: 'Produce a short Markdown quantity takeoff report: title, summary sentence, a table of all items (Label, Value, Unit), and optional CRITICAL WARNING section if any. Use ## for sections and | for the table.',
    },
    defaultBenchmarks: [],
  },
  {
    id: 'generic',
    docType: 'generic',
    name: 'Generic document',
    promptOverrides: {},
    defaultBenchmarks: [],
  },
];

export function getTemplate(templateId: string): ReportTemplate | undefined {
  return TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES.find((t) => t.id === 'generic');
}

export function listTemplates(): ReportTemplate[] {
  return [...TEMPLATES];
}

export function getPromptOverrides(templateId: string): ReportTemplate['promptOverrides'] {
  const t = getTemplate(templateId);
  return t?.promptOverrides ?? {};
}
