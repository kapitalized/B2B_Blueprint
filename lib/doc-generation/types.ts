/**
 * Doc Generation module: Word (.docx), PDF, Excel (.xlsx).
 * Report = multi-page structured output (TOC, sections, footnotes, graphs); same pipeline, different template.
 */

export type DocFormat = 'docx' | 'pdf' | 'xlsx';

/** Section for reports: title + body (markdown or plain); optional table data for Excel. */
export interface DocSection {
  title: string;
  body: string;
  /** Optional table for this section (e.g. quantities); used in Excel and in-doc tables. */
  table?: Array<Record<string, string | number>>;
}

/** Structured content for a Report (many pages, index, footnotes). Same data can be rendered as Doc or PDF. */
export interface ReportContent {
  title: string;
  subtitle?: string;
  /** Table of contents entries (section titles + optional page refs). */
  toc?: Array<{ title: string; page?: number }>;
  sections: DocSection[];
  /** Footnotes keyed by ref (e.g. "1" -> "Source: drawing A-101"). */
  footnotes?: Record<string, string>;
  /** Optional chart/graph placeholders (e.g. { id: "fig1", caption: "Area by level" }). */
  figures?: Array<{ id: string; caption: string }>;
  metadata?: { author?: string; date?: string; projectName?: string };
}

/** Input for simple doc (single block of content, no report structure). */
export interface SimpleDocContent {
  title: string;
  body: string;
  /** Optional table rows for Excel or embedded table in Doc/PDF. */
  table?: Array<Record<string, string | number>>;
}

/** Request payload: either full report or simple doc. */
export type DocGenerationInput =
  | { kind: 'report'; content: ReportContent }
  | { kind: 'simple'; content: SimpleDocContent };

export interface DocGenerationOptions {
  format: DocFormat;
  filename?: string;
  /** For PDF: include TOC and footnotes. For Doc: same. */
  includeToc?: boolean;
}

export interface DocGenerationResult {
  buffer: Buffer;
  contentType: string;
  suggestedFilename: string;
}
