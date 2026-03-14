'use client';

/**
 * Admin: Run logs — project, user, date, LLM used, tokens, duration.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/format-date';

interface RunLog {
  id: string;
  projectName: string;
  userEmail: string;
  analysisType: string;
  runStartedAt: string | null;
  runDurationMs: number | null;
  inputSizeBytes: number | null;
  inputSizeMb: number | null;
  inputPageCount: number | null;
  tokenUsage: {
    total_tokens?: number;
    total_prompt_tokens?: number;
    total_completion_tokens?: number;
    total_cost?: number;
  } | null;
  modelsUsed: { extraction?: string; analysis?: string; synthesis?: string } | null;
  createdAt: string | null;
}

export default function AdminRunLogsPage() {
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/run-logs?limit=100')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function formatRunDate(iso: string | null) {
    if (!iso) return '—';
    return formatDateTime(iso);
  }

  function shortModel(id: string | undefined) {
    if (!id) return '—';
    const parts = id.split('/');
    return parts[parts.length - 1] ?? id;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/ai-models" className="text-sm text-muted-foreground hover:text-foreground">
            AI models
          </Link>
          <Link href="/dashboard/admin/usage" className="text-sm text-muted-foreground hover:text-foreground">
            Usage & cost
          </Link>
        </div>
      </div>
      <h1 className="text-2xl font-bold">Run logs</h1>
      <p className="text-sm text-muted-foreground">
        Pipeline runs with project, user, date, models, and token usage. Use this to monitor AI usage.
      </p>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Date / time</th>
                <th className="p-3 text-left font-medium">Project</th>
                <th className="p-3 text-left font-medium">User</th>
                <th className="p-3 text-left font-medium">Type</th>
                <th className="p-3 text-right font-medium">Duration</th>
                <th className="p-3 text-right font-medium">Input</th>
                <th className="p-3 text-left font-medium">LLM (ext / ana / syn)</th>
                <th className="p-3 text-right font-medium">Tokens</th>
                <th className="p-3 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No run logs yet. Run analysis from Documents to generate reports.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 whitespace-nowrap">{formatRunDate(log.runStartedAt ?? log.createdAt)}</td>
                    <td className="p-3">{log.projectName}</td>
                    <td className="p-3">{log.userEmail}</td>
                    <td className="p-3">{log.analysisType}</td>
                    <td className="p-3 text-right">
                      {log.runDurationMs != null ? `${(log.runDurationMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {log.inputSizeMb != null ? `${log.inputSizeMb} MB` : log.inputPageCount != null ? `${log.inputPageCount} pg` : '—'}
                    </td>
                    <td className="p-3 text-xs">
                      {log.modelsUsed ? (
                        <span className="flex flex-col gap-0.5">
                          <span title={log.modelsUsed.extraction}>{shortModel(log.modelsUsed.extraction)}</span>
                          <span title={log.modelsUsed.analysis}>{shortModel(log.modelsUsed.analysis)}</span>
                          <span title={log.modelsUsed.synthesis}>{shortModel(log.modelsUsed.synthesis)}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {log.tokenUsage?.total_tokens != null
                        ? log.tokenUsage.total_tokens.toLocaleString()
                        : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {log.tokenUsage?.total_cost != null ? `$${log.tokenUsage.total_cost.toFixed(4)}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
