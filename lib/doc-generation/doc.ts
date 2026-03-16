/**
 * Word (.docx) generation using the docx package.
 */
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
  HeadingLevel,
  convertInchesToTwip,
} from 'docx';
import type { ReportContent, SimpleDocContent, DocSection } from './types';

function sectionToParagraphs(section: DocSection): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  out.push(
    new Paragraph({
      text: section.title,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    })
  );
  const lines = section.body.split(/\n/).filter(Boolean);
  for (const line of lines) {
    out.push(
      new Paragraph({
        children: [new TextRun(line)],
        spacing: { after: 80 },
      })
    );
  }
  if (section.table && section.table.length > 0) {
    const headers = Object.keys(section.table[0]);
    const headerRow = new TableRow({
      children: headers.map(
        (h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true })],
              }),
            ],
            shading: { fill: 'E8E8E8' },
          })
      ),
      tableHeader: true,
    });
    const bodyRows = section.table.map(
      (row) =>
        new TableRow({
          children: headers.map((h) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun(String(row[h] ?? ''))],
                }),
              ],
            })
          ),
        })
    );
    out.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [headerRow, ...bodyRows],
      })
    );
  }
  return out;
}

function buildReportDoc(content: ReportContent): Document {
  const children: (Paragraph | Table)[] = [];
  children.push(
    new Paragraph({
      text: content.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    })
  );
  if (content.subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: content.subtitle, italics: true })],
        spacing: { after: 240 },
      })
    );
  }
  if (content.toc && content.toc.length > 0) {
    children.push(
      new Paragraph({
        text: 'Contents',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 120 },
      })
    );
    for (const entry of content.toc) {
      children.push(
        new Paragraph({
          children: [
            new TextRun(entry.title),
            ...(entry.page != null ? [new TextRun({ text: ` .............. ${entry.page}`, italics: true })] : []),
          ],
          spacing: { after: 60 },
        })
      );
    }
    children.push(
      new Paragraph({
        text: '',
        spacing: { before: 200, after: 200 },
      })
    );
  }
  for (const section of content.sections) {
    children.push(...sectionToParagraphs(section));
  }
  if (content.footnotes && Object.keys(content.footnotes).length > 0) {
    children.push(
      new Paragraph({
        text: 'Footnotes',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
      })
    );
    for (const [ref, text] of Object.entries(content.footnotes)) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${ref}] `, bold: true }),
            new TextRun(text),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });
}

function buildSimpleDoc(content: SimpleDocContent): Document {
  const children: (Paragraph | Table)[] = [];
  children.push(
    new Paragraph({
      text: content.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    })
  );
  for (const line of content.body.split(/\n/).filter(Boolean)) {
    children.push(
      new Paragraph({
        children: [new TextRun(line)],
        spacing: { after: 80 },
      })
    );
  }
  if (content.table && content.table.length > 0) {
    const headers = Object.keys(content.table[0]);
    const headerRow = new TableRow({
      children: headers.map((h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
            }),
          ],
          shading: { fill: 'E8E8E8' },
        })
      ),
      tableHeader: true,
    });
    const bodyRows = content.table.map((row) =>
      new TableRow({
        children: headers.map((h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun(String(row[h] ?? ''))],
              }),
            ],
          })
        ),
      })
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [headerRow, ...bodyRows],
      })
    );
  }
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });
}

export async function generateDocx(
  input: { kind: 'report'; content: ReportContent } | { kind: 'simple'; content: SimpleDocContent }
): Promise<Buffer> {
  const doc = input.kind === 'report' ? buildReportDoc(input.content) : buildSimpleDoc(input.content);
  return Packer.toBuffer(doc) as Promise<Buffer>;
}
