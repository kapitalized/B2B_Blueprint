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
    name: 'Quantity takeoff',
    promptOverrides: {
      extraction: 'Extract quantities, units, and line items with spatial regions if present.',
      analysis: 'Apply density and rate constants from the library.',
      synthesis: 'Format as a takeoff table with totals and unit breakdown.',
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
