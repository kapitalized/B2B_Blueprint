'use client';

import { useEffect, useState, useMemo } from 'react';

interface BillingRow {
  id: string;
  name: string;
  slug: string;
  planStatus: string | null;
  planTier: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  updatedAt: string | null;
}

export function BillingView() {
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [planTierFilter, setPlanTierFilter] = useState<string>('');
  const [planStatusFilter, setPlanStatusFilter] = useState<string>('');

  useEffect(() => {
    fetch('/api/admin/billing?limit=500', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.slug.toLowerCase().includes(q)) return false;
      }
      if (planTierFilter && (r.planTier ?? '') !== planTierFilter) return false;
      if (planStatusFilter && (r.planStatus ?? '') !== planStatusFilter) return false;
      return true;
    });
  }, [rows, searchFilter, planTierFilter, planStatusFilter]);

  const planTiers = useMemo(() => Array.from(new Set(rows.map((r) => r.planTier).filter(Boolean))) as string[], [rows]);
  const planStatuses = useMemo(() => Array.from(new Set(rows.map((r) => r.planStatus).filter(Boolean))) as string[], [rows]);

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Organisations with Stripe customer and subscription data. For paid invoices see Billings.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search org or slug"
          className="rounded border px-2 py-1.5 text-sm w-48"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={planTierFilter}
          onChange={(e) => setPlanTierFilter(e.target.value)}
        >
          <option value="">All tiers</option>
          {planTiers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={planStatusFilter}
          onChange={(e) => setPlanStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {planStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} of {rows.length}</span>
      </div>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Org</th>
              <th className="p-2 text-left font-medium">Slug</th>
              <th className="p-2 text-left font-medium">Plan tier</th>
              <th className="p-2 text-left font-medium">Status</th>
              <th className="p-2 text-left font-medium">Customer ID</th>
              <th className="p-2 text-left font-medium">Subscription ID</th>
              <th className="p-2 text-left font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {rows.length === 0 ? 'No organisations with billing data yet.' : 'No subscriptions match the filter.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 font-mono text-xs">{r.slug}</td>
                  <td className="p-2">{r.planTier ?? '—'}</td>
                  <td className="p-2">{r.planStatus ?? '—'}</td>
                  <td className="p-2 font-mono text-xs">{r.stripeCustomerId ? r.stripeCustomerId.slice(0, 20) + '…' : '—'}</td>
                  <td className="p-2 font-mono text-xs">{r.stripeSubscriptionId ? r.stripeSubscriptionId.slice(0, 20) + '…' : '—'}</td>
                  <td className="p-2 text-muted-foreground">{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
