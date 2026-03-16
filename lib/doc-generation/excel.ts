/**
 * Excel (.xlsx) generation using exceljs.
 */
import ExcelJS from 'exceljs';
import type { ReportContent, SimpleDocContent } from './types';

function addTableToSheet(
  sheet: ExcelJS.Worksheet,
  table: Array<Record<string, string | number>>,
  startRow: number
): number {
  if (table.length === 0) return startRow;
  const headers = Object.keys(table[0]);
  headers.forEach((h, i) => {
    const cell = sheet.getCell(startRow, i + 1);
    cell.value = h;
    cell.font = { bold: true };
  });
  let row = startRow + 1;
  for (const r of table) {
    headers.forEach((h, i) => {
      sheet.getCell(row, i + 1).value = r[h];
    });
    row++;
  }
  return row + 1;
}

export async function generateExcel(
  input: { kind: 'report'; content: ReportContent } | { kind: 'simple'; content: SimpleDocContent }
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'B2B Blueprint';
  wb.created = new Date();

  if (input.kind === 'report') {
    const c = input.content;
    const sheet = wb.addWorksheet(sanitizeSheetName(c.title.slice(0, 28)), {
      headerFooter: { firstHeader: c.title, firstFooter: c.metadata?.date ?? new Date().toISOString().slice(0, 10) },
    });
    let row = 1;
    sheet.getCell(row, 1).value = c.title;
    sheet.getCell(row, 1).font = { size: 16, bold: true };
    row += 2;
    for (const section of c.sections) {
      sheet.getCell(row, 1).value = section.title;
      sheet.getCell(row, 1).font = { bold: true };
      row++;
      for (const line of section.body.split(/\n/).filter(Boolean)) {
        sheet.getCell(row, 1).value = line;
        row++;
      }
      if (section.table && section.table.length > 0) {
        row = addTableToSheet(sheet, section.table, row);
        row++;
      }
    }
    if (c.footnotes && Object.keys(c.footnotes).length > 0) {
      row += 1;
      sheet.getCell(row, 1).value = 'Footnotes';
      sheet.getCell(row, 1).font = { bold: true };
      row++;
      for (const [ref, text] of Object.entries(c.footnotes)) {
        sheet.getCell(row, 1).value = `[${ref}] ${text}`;
        row++;
      }
    }
  } else {
    const c = input.content;
    const sheet = wb.addWorksheet(sanitizeSheetName(c.title.slice(0, 28)));
    let row = 1;
    sheet.getCell(row, 1).value = c.title;
    sheet.getCell(row, 1).font = { size: 14, bold: true };
    row += 2;
    for (const line of c.body.split(/\n/).filter(Boolean)) {
      sheet.getCell(row, 1).value = line;
      row++;
    }
    if (c.table && c.table.length > 0) {
      row++;
      addTableToSheet(sheet, c.table, row);
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?:\[\]]/g, '_').slice(0, 31) || 'Sheet1';
}
