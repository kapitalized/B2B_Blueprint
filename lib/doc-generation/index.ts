/**
 * Doc Generation: Word (.docx), PDF, Excel (.xlsx).
 * Use generateDoc() for all formats; use Report content for multi-page reports (TOC, footnotes).
 */
import type { DocFormat, DocGenerationInput, DocGenerationOptions, DocGenerationResult } from './types';
import { generateDocx } from './doc';
import { generatePdf } from './pdf';
import { generateExcel } from './excel';

const MIME: Record<DocFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const EXT: Record<DocFormat, string> = {
  docx: '.docx',
  pdf: '.pdf',
  xlsx: '.xlsx',
};

export async function generateDoc(
  input: DocGenerationInput,
  options: DocGenerationOptions
): Promise<DocGenerationResult> {
  const format = options.format;
  const baseName =
    options.filename ?? (input.kind === 'report' ? input.content.title : input.content.title) ?? 'document';
  const safeName = baseName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
  const suggestedFilename = safeName + EXT[format];

  let buffer: Buffer;
  switch (format) {
    case 'docx':
      buffer = await generateDocx(input);
      break;
    case 'pdf':
      buffer = await generatePdf(input);
      break;
    case 'xlsx':
      buffer = await generateExcel(input);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return {
    buffer,
    contentType: MIME[format],
    suggestedFilename,
  };
}

export type { DocFormat, ReportContent, SimpleDocContent, DocGenerationInput, DocGenerationOptions, DocGenerationResult } from './types';
export { generateDocx } from './doc';
export { generatePdf } from './pdf';
export { generateExcel } from './excel';
