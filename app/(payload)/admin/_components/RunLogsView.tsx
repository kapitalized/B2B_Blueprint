'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/format-date';

interface RunLog {
  id: string;
  projectName: string;
  userEmail: string;
  analysisType: string;
  runStartedAt: string | null;
  runDurationMs: number | null;
  inputSizeMb: number | null;
  inputPageCount: number | null;
  modelsUsed: { extraction?: string; analysis?: string; synthesis?: string } | null;
  tokenUsage?: { total_tokens?: number; total_cost?: number };
  createdAt: string | null;
}

function shortModel(id: string | undefined) {
  if (!id) return '—';
  const parts = id.split('/');
  return parts[parts.length - 1] ?? id;
}

export function RunLogsView() {
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/run-logs?limit=100', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function formatRunDate(iso: string | null) {
    if (!iso) return '—';
    return formatDateTime(iso);
  }

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">AI run logs</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pipeline runs: project, user, models, tokens.</p>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Date</th>
              <th className="p-2 text-left font-medium">Project</th>
              <th className="p-2 text-left font-medium">User</th>
              <th className="p-2 text-left font-medium">Type</th>
              <th className="p-2 text-right font-medium">Duration</th>
              <th className="p-2 text-right font-medium">Input</th>
              <th className="p-2 text-left font-medium">Models</th>
              <th className="p-2 text-right font-medium">Tokens</th>
              <th className="p-2 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No run logs yet.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="p-2 whitespace-nowrap">{formatRunDate(log.runStartedAt ?? log.createdAt)}</td>
                  <td className="p-2">{log.projectName}</td>
                  <td className="p-2">{log.userEmail}</td>
                  <td className="p-2">{log.analysisType}</td>
                  <td className="p-2 text-right">{log.runDurationMs != null ? `${(log.runDurationMs / 1000).toFixed(1)}s` : '—'}</td>
                  <td className="p-2 text-right">{log.inputSizeMb != null ? `${log.inputSizeMb} MB` : log.inputPageCount != null ? `${log.inputPageCount} pg` : '—'}</td>
                  <td className="p-2 text-xs">
                    {log.modelsUsed ? (
                      <span className="flex flex-col">
                        <span title={log.modelsUsed.extraction}>{shortModel(log.modelsUsed.extraction)}</span>
                        <span title={log.modelsUsed.analysis}>{shortModel(log.modelsUsed.analysis)}</span>
                        <span title={log.modelsUsed.synthesis}>{shortModel(log.modelsUsed.synthesis)}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-2 text-right">{log.tokenUsage?.total_tokens != null ? log.tokenUsage.total_tokens.toLocaleString() : '—'}</td>
                  <td className="p-2 text-right">{log.tokenUsage?.total_cost != null ? `$${log.tokenUsage.total_cost.toFixed(4)}` : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
