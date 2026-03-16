/**
 * PDF generation using pdf-lib. Simple text layout; tables rendered as lines of text.
 * For rich tables consider pdf-lib-table or HTML→PDF (Puppeteer) later.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { ReportContent, SimpleDocContent, DocSection } from './types';

const MARGIN = 50;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 18;
const HEADING_SIZE = 14;
const BODY_SIZE = 11;

function drawSection(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  content: DocSection,
  y: number
): number {
  let currentY = y;
  const pageWidth = page.getWidth();
  const maxWidth = pageWidth - 2 * MARGIN;

  page.drawText(content.title, {
    x: MARGIN,
    y: currentY,
    size: HEADING_SIZE,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  currentY -= LINE_HEIGHT * 1.2;

  const lines = content.body.split(/\n/).filter(Boolean);
  for (const line of lines) {
    if (currentY < MARGIN + LINE_HEIGHT) break;
    page.drawText(line.slice(0, 120), {
      x: MARGIN,
      y: currentY,
      size: BODY_SIZE,
      font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth,
    });
    currentY -= LINE_HEIGHT;
  }
  if (content.table && content.table.length > 0) {
    currentY -= LINE_HEIGHT * 0.5;
    const headers = Object.keys(content.table[0]);
    const headerText = headers.join('  |  ');
    page.drawText(headerText.slice(0, 100), {
      x: MARGIN,
      y: currentY,
      size: BODY_SIZE,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    currentY -= LINE_HEIGHT;
    for (const row of content.table.slice(0, 15)) {
      if (currentY < MARGIN + LINE_HEIGHT) break;
      const rowText = headers.map((h) => String(row[h] ?? '')).join('  |  ');
      page.drawText(rowText.slice(0, 100), {
        x: MARGIN,
        y: currentY,
        size: BODY_SIZE,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= LINE_HEIGHT;
    }
  }
  return currentY;
}

export async function generatePdf(
  input: { kind: 'report'; content: ReportContent } | { kind: 'simple'; content: SimpleDocContent }
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([595, 842]);
  let y = page.getHeight() - MARGIN;

  if (input.kind === 'report') {
    const c = input.content;
    page.drawText(c.title, {
      x: MARGIN,
      y,
      size: TITLE_SIZE,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT * 1.5;
    if (c.subtitle) {
      page.drawText(c.subtitle, {
        x: MARGIN,
        y,
        size: BODY_SIZE,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= LINE_HEIGHT * 1.2;
    }
    if (c.toc && c.toc.length > 0) {
      page.drawText('Contents', {
        x: MARGIN,
        y,
        size: HEADING_SIZE,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT * 1.2;
      for (const entry of c.toc) {
        if (y < MARGIN + LINE_HEIGHT) {
          page = pdfDoc.addPage([595, 842]);
          y = page.getHeight() - MARGIN;
        }
        page.drawText(entry.title, { x: MARGIN, y, size: BODY_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
        y -= LINE_HEIGHT;
      }
      y -= LINE_HEIGHT;
    }
    for (const section of c.sections) {
      if (y < MARGIN + LINE_HEIGHT * 4) {
        page = pdfDoc.addPage([595, 842]);
        y = page.getHeight() - MARGIN;
      }
      y = drawSection(page, font, boldFont, section, y) - LINE_HEIGHT;
    }
    if (c.footnotes && Object.keys(c.footnotes).length > 0) {
      if (y < MARGIN + LINE_HEIGHT * 4) {
        page = pdfDoc.addPage([595, 842]);
        y = page.getHeight() - MARGIN;
      }
      page.drawText('Footnotes', {
        x: MARGIN,
        y,
        size: HEADING_SIZE,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT * 1.2;
      for (const [ref, text] of Object.entries(c.footnotes)) {
        if (y < MARGIN + LINE_HEIGHT) {
          page = pdfDoc.addPage([595, 842]);
          y = page.getHeight() - MARGIN;
        }
        page.drawText(`[${ref}] ${text}`.slice(0, 120), {
          x: MARGIN,
          y,
          size: BODY_SIZE,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= LINE_HEIGHT;
      }
    }
  } else {
    const c = input.content;
    page.drawText(c.title, {
      x: MARGIN,
      y,
      size: TITLE_SIZE,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT * 1.5;
    for (const line of c.body.split(/\n/).filter(Boolean)) {
      if (y < MARGIN + LINE_HEIGHT) {
        page = pdfDoc.addPage([595, 842]);
        y = page.getHeight() - MARGIN;
      }
      page.drawText(line.slice(0, 120), {
        x: MARGIN,
        y,
        size: BODY_SIZE,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= LINE_HEIGHT;
    }
    if (c.table && c.table.length > 0) {
      y -= LINE_HEIGHT;
      const headers = Object.keys(c.table[0]);
      page.drawText(headers.join('  |  '), {
        x: MARGIN,
        y,
        size: BODY_SIZE,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT;
      for (const row of c.table) {
        if (y < MARGIN + LINE_HEIGHT) {
          page = pdfDoc.addPage([595, 842]);
          y = page.getHeight() - MARGIN;
        }
        page.drawText(
          headers.map((h) => String(row[h] ?? '')).join('  |  '),
          { x: MARGIN, y, size: BODY_SIZE, font, color: rgb(0.2, 0.2, 0.2) }
        );
        y -= LINE_HEIGHT;
      }
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
