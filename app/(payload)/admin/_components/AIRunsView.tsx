'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/format-date';

interface RunRow {
  id: string;
  projectId: string | null;
  projectName: string | null;
  projectShortId: string | null;
  analysisType: string;
  createdAt: string | null;
  runDurationMs: number | null;
  runStartedAt: string | null;
}

interface RunDetail {
  id: string;
  analysisResult: unknown;
  rawExtraction: unknown;
  stepTrace: unknown;
  tokenUsage: unknown;
  modelsUsed: unknown;
  [key: string]: unknown;
}

export function AIRunsView() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<RunDetail | null>(null);

  useEffect(() => {
    fetch('/api/admin/ai-runs?limit=100', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openJson = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ai-runs/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = (await res.json()) as RunDetail;
      setViewing(data);
    } catch {
      setError('Failed to load run JSON');
    }
  };

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">AI analysis runs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pipeline run output (analysis result, extraction, step trace, token usage). View JSON to inspect stored output.
      </p>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Type</th>
              <th className="p-2 text-left font-medium">Project</th>
              <th className="p-2 text-left font-medium">Created</th>
              <th className="p-2 text-right font-medium">Duration</th>
              <th className="p-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No AI runs yet. Run an analysis from a project to see output here.
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2">{r.analysisType}</td>
                  <td className="p-2">{r.projectName ?? '—'} {r.projectShortId ? `(${r.projectShortId})` : ''}</td>
                  <td className="p-2">{r.createdAt ? formatDateTime(r.createdAt) : '—'}</td>
                  <td className="p-2 text-right">{r.runDurationMs != null ? `${r.runDurationMs} ms` : '—'}</td>
                  <td className="p-2">
                    <button type="button" className="text-primary underline" onClick={() => openJson(r.id)}>
                      View JSON
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewing(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded bg-background p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Run output (JSON)</h2>
              <button type="button" className="rounded border px-2 py-1" onClick={() => setViewing(null)}>Close</button>
            </div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words rounded border p-3 bg-muted/30 max-h-[70vh] overflow-y-auto">
              {JSON.stringify(viewing, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
