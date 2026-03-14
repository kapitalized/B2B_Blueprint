'use client';

/**
 * Admin: AI usage and cost — summary, by model, by event type, by day, recent rows.
 * Data from logs_ai_runs (pipeline runs + chat turns when logged).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateTime, formatDate } from '@/lib/format-date';

interface UsageResponse {
  summary: { totalCost: number; totalTokens: number; totalCalls: number };
  byModel: { model: string; cost: number; tokens: number; count: number }[];
  byEventType: { eventType: string; cost: number; tokens: number; count: number }[];
  byDay: { day: string; cost: number; tokens: number; count: number }[];
  _message?: string;
  rows: {
    id: string;
    createdAt: string | null;
    eventType: string;
    projectName: string | null;
    userEmail: string | null;
    provider: string;
    model: string | null;
    totalTokens: number | null;
    cost: number | null;
    latencyMs: number | null;
  }[];
}

function shortModel(model: string | null) {
  if (!model) return '—';
  const parts = model.split('/');
  return parts[parts.length - 1] ?? model;
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function fetchUsage() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('limit', '200');
    fetch(`/api/admin/ai-usage?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Unauthorized' : 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsage();
  }, []);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/ai-models" className="text-sm text-muted-foreground hover:text-foreground">
            ← Admin
          </Link>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI usage & cost</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usage and cost from <code className="rounded bg-muted px-1">logs_ai_runs</code> (pipeline runs and chat
            turns). Run <code className="rounded bg-muted px-1">scripts/create-logs-tables.sql</code> if the table is
            missing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border bg-background px-2 py-1.5 text-sm"
            title="From date"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border bg-background px-2 py-1.5 text-sm"
            title="To date"
          />
          <button
            type="button"
            onClick={fetchUsage}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard/admin/ai-models" className="text-sm text-muted-foreground hover:text-foreground">
          AI models
        </Link>
        <Link href="/dashboard/admin/run-logs" className="text-sm text-muted-foreground hover:text-foreground">
          Run logs (pipeline)
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : data ? (
        <>
          {data._message && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
              {data._message}
            </div>
          )}
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">Total cost</p>
              <p className="mt-1 text-2xl font-semibold">
                ${data.summary.totalCost.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">Total tokens</p>
              <p className="mt-1 text-2xl font-semibold">
                {data.summary.totalTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">Total calls</p>
              <p className="mt-1 text-2xl font-semibold">{data.summary.totalCalls.toLocaleString()}</p>
            </div>
          </div>

          {/* By model & by event type */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card">
              <h2 className="border-b p-3 font-semibold">By model</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Model</th>
                      <th className="p-2 text-right font-medium">Cost</th>
                      <th className="p-2 text-right font-medium">Tokens</th>
                      <th className="p-2 text-right font-medium">Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byModel.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                          No data in range
                        </td>
                      </tr>
                    ) : (
                      data.byModel.map((row) => (
                        <tr key={row.model} className="border-b last:border-0">
                          <td className="p-2" title={row.model}>
                            {shortModel(row.model)}
                          </td>
                          <td className="p-2 text-right">${row.cost.toFixed(4)}</td>
                          <td className="p-2 text-right">{row.tokens.toLocaleString()}</td>
                          <td className="p-2 text-right">{row.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-lg border bg-card">
              <h2 className="border-b p-3 font-semibold">By event type</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Type</th>
                      <th className="p-2 text-right font-medium">Cost</th>
                      <th className="p-2 text-right font-medium">Tokens</th>
                      <th className="p-2 text-right font-medium">Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byEventType.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                          No data in range
                        </td>
                      </tr>
                    ) : (
                      data.byEventType.map((row) => (
                        <tr key={row.eventType} className="border-b last:border-0">
                          <td className="p-2">{row.eventType}</td>
                          <td className="p-2 text-right">${row.cost.toFixed(4)}</td>
                          <td className="p-2 text-right">{row.tokens.toLocaleString()}</td>
                          <td className="p-2 text-right">{row.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* By day */}
          <div className="rounded-lg border bg-card">
            <h2 className="border-b p-3 font-semibold">By day (last 31)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Day</th>
                    <th className="p-2 text-right font-medium">Cost</th>
                    <th className="p-2 text-right font-medium">Tokens</th>
                    <th className="p-2 text-right font-medium">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDay.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No data in range
                      </td>
                    </tr>
                  ) : (
                    data.byDay.map((row) => (
                      <tr key={row.day} className="border-b last:border-0">
                        <td className="p-2">{formatDate(row.day)}</td>
                        <td className="p-2 text-right">${row.cost.toFixed(4)}</td>
                        <td className="p-2 text-right">{row.tokens.toLocaleString()}</td>
                        <td className="p-2 text-right">{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent rows */}
          <div className="rounded-lg border bg-card">
            <h2 className="border-b p-3 font-semibold">Recent calls</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Time</th>
                    <th className="p-2 text-left font-medium">Type</th>
                    <th className="p-2 text-left font-medium">Project</th>
                    <th className="p-2 text-left font-medium">User</th>
                    <th className="p-2 text-left font-medium">Model</th>
                    <th className="p-2 text-right font-medium">Tokens</th>
                    <th className="p-2 text-right font-medium">Cost</th>
                    <th className="p-2 text-right font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground">
                        No log rows yet. Pipeline runs and chat (when logged) will appear here.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-2 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                        <td className="p-2">{row.eventType}</td>
                        <td className="p-2 max-w-[120px] truncate" title={row.projectName ?? ''}>
                          {row.projectName ?? '—'}
                        </td>
                        <td className="p-2 max-w-[160px] truncate" title={row.userEmail ?? ''}>
                          {row.userEmail ?? '—'}
                        </td>
                        <td className="p-2" title={row.model ?? ''}>
                          {shortModel(row.model)}
                        </td>
                        <td className="p-2 text-right">
                          {row.totalTokens != null ? row.totalTokens.toLocaleString() : '—'}
                        </td>
                        <td className="p-2 text-right">
                          {row.cost != null ? `$${row.cost.toFixed(4)}` : '—'}
                        </td>
                        <td className="p-2 text-right">
                          {row.latencyMs != null ? `${row.latencyMs}ms` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
