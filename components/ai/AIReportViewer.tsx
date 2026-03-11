'use client';

/**
 * Report viewer: markdown content, data table, and CSV export.
 */

import ReactMarkdown from 'react-markdown';
import { downloadCSV } from '@/lib/ai/export';
import type { AuditItem } from '@/lib/ai/citation-audit';

export interface ReportForViewer {
  id?: string;
  reportTitle?: string;
  content_md?: string | null;
  content?: string | null;
  data_payload?: unknown[];
  createdAt?: string | null;
}

interface AIReportViewerProps {
  report?: ReportForViewer | null;
  isLoading?: boolean;
}

function isAuditItem(x: unknown): x is AuditItem {
  return typeof x === 'object' && x !== null && 'label' in x && 'value' in x;
}

export default function AIReportViewer({ report, isLoading }: AIReportViewerProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Generating report…
      </div>
    );
  }
  const content = report?.content_md ?? report?.content ?? '';
  const payload = report?.data_payload;
  const items: AuditItem[] = Array.isArray(payload)
    ? payload.filter(isAuditItem) as AuditItem[]
    : [];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">{report?.reportTitle ?? 'Report'}</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => downloadCSV(items, `report-${report?.id ?? 'export'}.csv`)}
            className="text-sm px-3 py-1.5 rounded-md border bg-muted hover:bg-muted/80"
          >
            Export CSV
          </button>
        )}
      </div>
      {content ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : null}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-2 text-left">Label</th>
                <th className="border p-2 text-right">Value</th>
                <th className="border p-2 text-left">Unit</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={i.id ?? idx}>
                  <td className="border p-2">{i.label}</td>
                  <td className="border p-2 text-right">{i.value}</td>
                  <td className="border p-2">{i.unit ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!content && items.length === 0 && (
        <p className="text-muted-foreground text-sm">No content. Run the pipeline from Documents to generate reports.</p>
      )}
    </div>
  );
}
