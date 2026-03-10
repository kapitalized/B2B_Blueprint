/**
 * Export (recommendation 4): Excel/CSV for tables; optional PDF for signed reports.
 * Stubs; implement with xlsx and jsPDF (or server-side) when needed.
 */

import type { AuditItem } from './citation-audit';

/** Build CSV string from analysis items. Use for download. */
export function exportToCSV(items: AuditItem[], _options?: { filename?: string }): string {
  const headers = ['id', 'label', 'value', 'unit', 'citation_id'];
  const rows = items.map((i) =>
    [i.id, i.label, String(i.value), i.unit ?? '', i.citation_id ?? ''].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  return csv;
}

/** Trigger browser download of CSV. */
export function downloadCSV(items: AuditItem[], filename = 'report.csv'): void {
  const csv = exportToCSV(items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Stub: Excel export. Implement with xlsx or similar. */
export function exportToExcel(
  _items: AuditItem[],
  _options?: { sheetName?: string }
): Promise<Blob> {
  return Promise.resolve(new Blob(['Excel stub'], { type: 'application/vnd.ms-excel' }));
}

/** Stub: PDF export for signed reports. Implement with jsPDF or server-side. */
export function exportToPDF(
  _title: string,
  _contentMd: string,
  _options?: { includeTables?: boolean }
): Promise<Blob> {
  return Promise.resolve(new Blob(['PDF stub'], { type: 'application/pdf' }));
}
