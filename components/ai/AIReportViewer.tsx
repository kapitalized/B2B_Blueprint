'use client';

/**
 * Report viewer: markdown content, data table, pipeline step trace, CSV export, and detection overlay.
 */

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { downloadCSV } from '@/lib/ai/export';
import type { AuditItem } from '@/lib/ai/citation-audit';
import PlanOverlayViewer, { type OverlayItem } from './PlanOverlayViewer';
import { formatDateTime } from '@/lib/format-date';

export interface StepTraceEntry {
  step: string;
  /** Optional display label (e.g. "Extraction (bounding boxes)"). */
  stepLabel?: string;
  model: string;
  promptPreview: string;
  responsePreview: string;
  tokenUsage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
  error?: string;
}

export interface ReportForViewer {
  id?: string;
  reportTitle?: string;
  content_md?: string | null;
  content?: string | null;
  data_payload?: unknown[];
  createdAt?: string | null;
  runMetadata?: {
    runStartedAt?: string;
    runDurationMs?: number;
    inputSizeBytes?: number;
    inputSizeMb?: number;
    inputPageCount?: number;
    tokenUsage?: {
      total_tokens?: number;
      total_prompt_tokens?: number;
      total_completion_tokens?: number;
      total_cost?: number;
      extraction?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      analysis?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      synthesis?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    stepTrace?: StepTraceEntry[];
    modelsUsed?: Record<string, string>;
    documentSource?: string[];
  };
}

interface AIReportViewerProps {
  report?: ReportForViewer | null;
  isLoading?: boolean;
}

function isAuditItem(x: unknown): x is AuditItem {
  return typeof x === 'object' && x !== null && 'label' in x && 'value' in x;
}

function DetectionOverlaySection({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const [overlay, setOverlay] = useState<{ imageUrl: string | null; items: OverlayItem[] } | null>(null);

  useEffect(() => {
    if (!open || !reportId) return;
    fetch(`/api/reports/${reportId}/overlay`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setOverlay({ imageUrl: data.imageUrl ?? null, items: data.items ?? [] }))
      .catch(() => setOverlay({ imageUrl: null, items: [] }));
  }, [open, reportId]);

  return (
    <div className="border rounded-lg bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/30"
      >
        <span>Detection boxes on plan</span>
        <span className="text-muted-foreground">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="border-t p-4">
          {overlay === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <PlanOverlayViewer imageUrl={overlay.imageUrl} items={overlay.items} />
          )}
        </div>
      )}
    </div>
  );
}

function PipelineStepsSection({ steps }: { steps: StepTraceEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/30"
      >
        <span>Pipeline steps (what happened at each AI step)</span>
        <span className="text-muted-foreground">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="border-t divide-y px-4 py-2 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="pt-2 first:pt-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-foreground">
                <span className="rounded bg-primary/15 px-1.5 py-0.5">{s.stepLabel ?? s.step}</span>
                <span className="text-muted-foreground">{s.model}</span>
                {s.tokenUsage && (
                  <span className="text-muted-foreground">
                    {s.tokenUsage.prompt_tokens} in / {s.tokenUsage.completion_tokens} out
                    {s.tokenUsage.cost != null && ` · $${s.tokenUsage.cost.toFixed(4)}`}
                  </span>
                )}
                {s.error && <span className="text-destructive">Error: {s.error}</span>}
              </div>
              <div className="mt-1.5 grid gap-1.5 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium">Prompt:</span>
                  <pre className="mt-0.5 p-2 rounded bg-muted/50 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto text-xs">{s.promptPreview || '—'}</pre>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Response (preview):</span>
                  <pre className="mt-0.5 p-2 rounded bg-muted/50 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto text-xs">{s.responsePreview || (s.error ? '—' : '—')}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

  const run = report?.runMetadata;
  const runAt = run?.runStartedAt ? new Date(run.runStartedAt) : null;

  const isAreaUnit = (u: string | undefined) =>
    !u ? false : /m²|m2|sq\.?\s*m|square\s*meter/i.test(u);
  const areaItems = items.filter((i) => isAreaUnit(i.unit));
  const totalArea =
    areaItems.length > 0 ? areaItems.reduce((sum, i) => sum + (Number(i.value) || 0), 0) : null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">{report?.reportTitle ?? 'Report'}</h2>
      </div>
      {run && (runAt || run.runDurationMs != null || run.modelsUsed || run.documentSource || run.tokenUsage) && (
        <div className="text-sm border rounded-lg p-4 bg-muted/30 space-y-3">
          <span className="font-semibold text-foreground">Report stamp</span>
          <dl className="grid gap-2 sm:grid-cols-2">
            {runAt && (
              <>
                <dt className="text-muted-foreground">Date & time</dt>
                <dd className="font-medium">{formatDateTime(runAt)}</dd>
              </>
            )}
            {run.runDurationMs != null && (
              <>
                <dt className="text-muted-foreground">Run time</dt>
                <dd className="font-medium">{(run.runDurationMs / 1000).toFixed(1)}s</dd>
              </>
            )}
            {run.modelsUsed && Object.keys(run.modelsUsed).length > 0 && (
              <>
                <dt className="text-muted-foreground">Models used</dt>
                <dd className="font-medium">
                  <ul className="list-inside list-disc space-y-0.5">
                    {run.modelsUsed.extraction && <li>Extraction: {run.modelsUsed.extraction}</li>}
                    {run.modelsUsed.analysis && <li>Analysis: {run.modelsUsed.analysis}</li>}
                    {run.modelsUsed.synthesis && <li>Synthesis: {run.modelsUsed.synthesis}</li>}
                  </ul>
                </dd>
              </>
            )}
            {run.documentSource && run.documentSource.length > 0 && (
              <>
                <dt className="text-muted-foreground">Document source</dt>
                <dd className="font-medium">{run.documentSource.join(', ')}</dd>
              </>
            )}
            {run.tokenUsage?.total_tokens != null && (
              <>
                <dt className="text-muted-foreground">Tokens / cost</dt>
                <dd className="font-medium">
                  {run.tokenUsage.total_tokens.toLocaleString()}
                  {run.tokenUsage.total_cost != null && ` · $${run.tokenUsage.total_cost.toFixed(4)}`}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
      {run?.stepTrace && run.stepTrace.length > 0 && (
        <PipelineStepsSection steps={run.stepTrace} />
      )}
      {report?.id && (
        <DetectionOverlaySection reportId={report.id} />
      )}

      {/* Formatted report (markdown) first */}
      {content ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : null}

      {/* Total area at bottom when we have area items */}
      {totalArea != null && (
        <div className="border-t pt-4 text-sm">
          <p className="font-semibold text-foreground">
            Total area: {Number(totalArea.toFixed(2)).toLocaleString()} m²
          </p>
        </div>
      )}

      {/* Raw data: download only (no inline table) */}
      {items.length > 0 && (
        <div className="border rounded-lg bg-muted/20 p-3 text-sm">
          <p className="text-muted-foreground font-medium mb-1">Data</p>
          <p className="text-muted-foreground mb-2">Raw quantities are in a separate file. Download to open in Excel or other tools.</p>
          <button
            type="button"
            onClick={() => downloadCSV(items, `report-${report?.id ?? 'export'}.csv`)}
            className="text-sm px-3 py-1.5 rounded-md border bg-background hover:bg-muted"
          >
            Download CSV
          </button>
        </div>
      )}

      {!content && items.length === 0 && (
        <p className="text-muted-foreground text-sm">No content. Run the pipeline from Documents to generate reports.</p>
      )}
    </div>
  );
}
