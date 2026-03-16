'use client';

import { useEffect, useState } from 'react';
import { CURRENCY_OPTIONS } from '@/lib/admin-currency';

interface PlanRow {
  id: string;
  name: string;
  description: string;
  defaultPriceId: string | null;
  defaultPriceUnitAmount: number | null;
  defaultPriceCurrency: string | null;
  defaultPriceInterval: string | null;
}

export function StripePlansView() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCurrency, setNewCurrency] = useState('usd');
  const [newInterval, setNewInterval] = useState<'month' | 'year'>('month');
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/stripe-plans', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setPlans)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    const amount = Math.round(parseFloat(newAmount) * 100);
    if (!name || !Number.isFinite(amount) || amount < 0) {
      setError('Name and amount (e.g. 50 for $50) required.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stripe-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, unitAmount: amount, currency: newCurrency, interval: newInterval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setNewName('');
      setNewAmount('');
      setNewCurrency('usd');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: PlanRow) => {
    setEditingPlan(p);
    setEditName(p.name);
    setEditDescription(p.description ?? '');
  };

  const cancelEdit = () => {
    setEditingPlan(null);
    setEditName('');
    setEditDescription('');
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stripe-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingPlan.id,
          name: editName.trim() || editingPlan.name,
          description: editDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setEditingPlan(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this plan? It will no longer appear in checkout.')) return;
    try {
      const res = await fetch(`/api/admin/stripe-plans?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Archive failed');
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed');
    }
  };

  const formatPrice = (amount: number | null, currency: string | null, interval: string | null) => {
    if (amount == null) return '—';
    const cur = (currency ?? 'usd').toUpperCase();
    const n = (amount / 100).toFixed(2);
    return `${cur} ${n}/${interval ?? 'mo'}`;
  };

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Stripe plans</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        List, create, and archive subscription products. Price IDs are used in env (STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO).
      </p>

      <div className="mt-4 rounded border p-4">
        <h2 className="font-semibold">Create plan</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Plan name"
            className="rounded border px-2 py-1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Amount (e.g. 50)"
            className="w-24 rounded border px-2 py-1"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
          />
          <select
            className="rounded border px-2 py-1"
            value={newCurrency}
            onChange={(e) => setNewCurrency(e.target.value)}
          >
            {CURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="rounded border px-2 py-1"
            value={newInterval}
            onChange={(e) => setNewInterval(e.target.value as 'month' | 'year')}
          >
            <option value="month">/ month</option>
            <option value="year">/ year</option>
          </select>
          <button
            type="button"
            className="rounded bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Name</th>
              <th className="p-2 text-left font-medium">Price</th>
              <th className="p-2 text-left font-medium">Price ID</th>
              <th className="p-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No active plans. Create one above or check Stripe Dashboard.
                </td>
              </tr>
            ) : (
              plans.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  {editingPlan?.id === p.id ? (
                    <>
                      <td className="p-2">
                        <input
                          type="text"
                          className="w-full rounded border px-2 py-1 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name"
                        />
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {formatPrice(p.defaultPriceUnitAmount, p.defaultPriceCurrency, p.defaultPriceInterval)}
                      </td>
                      <td className="p-2 font-mono text-xs">{p.defaultPriceId ?? '—'}</td>
                      <td className="p-2 space-x-2">
                        <input
                          type="text"
                          className="min-w-[120px] rounded border px-2 py-1 text-sm"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                        />
                        <button
                          type="button"
                          className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" className="text-muted-foreground hover:underline text-xs" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 font-mono text-xs">
                        {formatPrice(p.defaultPriceUnitAmount, p.defaultPriceCurrency, p.defaultPriceInterval)}
                      </td>
                      <td className="p-2 font-mono text-xs">{p.defaultPriceId ?? '—'}</td>
                      <td className="p-2 space-x-2">
                        <button type="button" className="text-primary hover:underline" onClick={() => startEdit(p)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-destructive hover:underline"
                          onClick={() => handleArchive(p.id)}
                        >
                          Archive
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
