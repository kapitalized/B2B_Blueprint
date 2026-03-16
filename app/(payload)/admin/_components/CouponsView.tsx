'use client';

import { useEffect, useState } from 'react';
import { CURRENCY_OPTIONS } from '@/lib/admin-currency';

interface CouponRow {
  id: string;
  name: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  valid: boolean;
  timesRedeemed: number;
}

export function CouponsView() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [percentOff, setPercentOff] = useState('');
  const [amountOff, setAmountOff] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [duration, setDuration] = useState<'once' | 'repeating' | 'forever'>('once');
  const [durationInMonths, setDurationInMonths] = useState('3');
  const [promotionCode, setPromotionCode] = useState('');
  const [promoCodeCouponId, setPromoCodeCouponId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/coupons', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d.error || 'Failed to load')))))
      .then(setCoupons)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const pct = percentOff.trim() ? parseFloat(percentOff) : undefined;
    const amt = amountOff.trim() ? Math.round(parseFloat(amountOff) * 100) : undefined;
    if (pct == null && amt == null) {
      setError('Enter either percent off (e.g. 20) or amount off (e.g. 10 for $10).');
      return;
    }
    if (pct != null && (pct < 0 || pct > 100)) {
      setError('Percent off must be 0–100.');
      return;
    }
    if (amt != null && amt < 0) {
      setError('Amount off must be positive.');
      return;
    }
    if (duration === 'repeating' && (!durationInMonths || parseInt(durationInMonths, 10) < 1)) {
      setError('Duration in months required for repeating (e.g. 3).');
      return;
    }
    setCreating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: id.trim() || undefined,
          name: name.trim() || undefined,
          percentOff: pct,
          amountOff: amt,
          currency: currency.toLowerCase(),
          duration,
          durationInMonths: duration === 'repeating' ? parseInt(durationInMonths, 10) : undefined,
          promotionCode: promotionCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      if (data.promotionCode) setSuccessMessage(`Coupon and promotion code "${data.promotionCode.code}" created. Customers can enter it at checkout.`);
      setId('');
      setName('');
      setPercentOff('');
      setAmountOff('');
      setPromotionCode('');
      setDuration('once');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePromoCode = async (couponId: string) => {
    const code = window.prompt('Promotion code for customers to enter at checkout (e.g. SAVE20):');
    if (!code?.trim()) return;
    setPromoCodeCouponId(couponId);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/admin/coupons/promotion-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ couponId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccessMessage(`Promotion code "${data.code}" created. Customers can enter it at checkout.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create promotion code');
    } finally {
      setPromoCodeCouponId(null);
    }
  };

  const handleEdit = async (c: CouponRow) => {
    const name = window.prompt('Coupon name (display)', c.name ?? '');
    if (name === null) return;
    setEditingCouponId(c.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: c.id, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSuccessMessage('Coupon updated.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setEditingCouponId(null);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm(`Delete coupon "${couponId}"? It cannot be used for new checkouts.`)) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(couponId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const formatDiscount = (c: CouponRow) => {
    if (c.percentOff != null) return `${c.percentOff}% off`;
    if (c.amountOff != null && c.currency) {
      const n = (c.amountOff / 100).toFixed(2);
      return `${(c.currency ?? 'usd').toUpperCase()} ${n} off`;
    }
    return '—';
  };

  const formatDuration = (c: CouponRow) => {
    if (c.duration === 'once') return 'Once';
    if (c.duration === 'forever') return 'Forever';
    return `Repeating (${c.durationInMonths ?? '?'} mo)`;
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Coupons</h1>
      {error && <div className="mt-2 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {successMessage && <div className="mt-2 rounded bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200">{successMessage}</div>}
      <p className="mt-1 text-sm text-muted-foreground">
        Create coupons and promotion codes here. Customers enter the promotion code at checkout.
      </p>

      <div className="mt-4 rounded border p-4">
        <h2 className="font-semibold">Create coupon</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Coupon ID (optional)"
            className="w-28 rounded border px-2 py-1 text-sm"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Name (optional)"
            className="w-40 rounded border px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            placeholder="% off (0–100)"
            className="w-24 rounded border px-2 py-1 text-sm"
            min={0}
            max={100}
            value={percentOff}
            onChange={(e) => setPercentOff(e.target.value)}
          />
          <span className="text-muted-foreground">or</span>
          <input
            type="number"
            placeholder="Amount (e.g. 10)"
            className="w-24 rounded border px-2 py-1 text-sm"
            min={0}
            step={0.01}
            value={amountOff}
            onChange={(e) => setAmountOff(e.target.value)}
          />
          <select
            className="rounded border px-2 py-1 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={duration}
            onChange={(e) => setDuration(e.target.value as 'once' | 'repeating' | 'forever')}
          >
            <option value="once">Once</option>
            <option value="repeating">Repeating</option>
            <option value="forever">Forever</option>
          </select>
          {duration === 'repeating' && (
            <input
              type="number"
              placeholder="Months"
              className="w-20 rounded border px-2 py-1 text-sm"
              min={1}
              value={durationInMonths}
              onChange={(e) => setDurationInMonths(e.target.value)}
            />
          )}
          <input
            type="text"
            placeholder="Promo code (e.g. SAVE20)"
            className="w-36 rounded border px-2 py-1 text-sm"
            value={promotionCode}
            onChange={(e) => setPromotionCode(e.target.value)}
            title="Creates a promotion code so customers can enter this at checkout"
          />
          <button
            type="button"
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
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
              <th className="p-2 text-left font-medium">ID</th>
              <th className="p-2 text-left font-medium">Name</th>
              <th className="p-2 text-left font-medium">Discount</th>
              <th className="p-2 text-left font-medium">Duration</th>
              <th className="p-2 text-left font-medium">Redemptions</th>
              <th className="p-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No coupons. Create one above.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-2 font-mono text-xs">{c.id}</td>
                  <td className="p-2">{c.name ?? '—'}</td>
                  <td className="p-2">{formatDiscount(c)}</td>
                  <td className="p-2">{formatDuration(c)}</td>
                  <td className="p-2">{c.timesRedeemed}</td>
                  <td className="p-2 space-x-2">
                    <button
                      type="button"
                      className="text-primary hover:underline disabled:opacity-50"
                      onClick={() => handleEdit(c)}
                      disabled={editingCouponId === c.id}
                    >
                      {editingCouponId === c.id ? 'Saving…' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="text-primary hover:underline disabled:opacity-50"
                      onClick={() => handleCreatePromoCode(c.id)}
                      disabled={promoCodeCouponId === c.id}
                    >
                      {promoCodeCouponId === c.id ? 'Creating…' : 'Create promo code'}
                    </button>
                    <button
                      type="button"
                      className="text-destructive hover:underline"
                      onClick={() => handleDelete(c.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
