'use client';

/**
 * Billing: choose plan → pay via Stripe; current plan; invoices (linked to plan).
 * Only org owners can manage billing; others see read-only status and invoices.
 */
import { useEffect, useState } from 'react';
import { PLAN_DISPLAY, type PlanTier } from '@/lib/billing/config';
import { formatDate } from '@/lib/format-date';

interface BillingStatus {
  planStatus: string | null;
  planTier: string | null;
  stripeCustomerId: string | null;
  hasActiveSubscription: boolean;
}

interface BillingInvoice {
  id: string;
  number: string | null;
  status: string;
  amountPaid: number;
  currency: string;
  created: number;
  planName: string;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
}

interface StatusRes {
  billing: BillingStatus | null;
  canManage: boolean;
  invoices: BillingInvoice[];
}

export default function BillingPage() {
  const [status, setStatus] = useState<StatusRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'starter' | 'pro' | 'portal' | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/billing/status', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data.detail ?? data.error ?? (res.status === 401 ? 'Please sign in.' : 'Failed to load billing');
          throw new Error(msg);
        }
        if (!cancelled) setStatus(data as StatusRes);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleCheckout(tier: PlanTier) {
    setActionLoading(tier);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      if (data.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePortal() {
    setActionLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      if (data.url) window.location.href = data.url;
      else throw new Error('No portal URL returned');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open billing portal');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const billing = status?.billing ?? null;
  const canManage = status?.canManage ?? false;
  const active = billing?.hasActiveSubscription ?? false;
  const currentTier = (billing?.planTier === 'starter' || billing?.planTier === 'pro' ? billing.planTier : null) as PlanTier | null;
  const invoices = status?.invoices ?? [];

  function formatAmount(cents: number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toLowerCase() }).format(cents / 100);
  }

  function formatInvoiceDate(ts: number): string {
    return formatDate(new Date(ts * 1000));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-muted-foreground">
        Choose a plan and pay through Stripe. View your current plan and invoice history below.
      </p>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* 1. Choose plan — single paid Starter plan for owners */}
      {canManage && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-medium">Subscription</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscribe to the Starter plan. You’ll complete payment on Stripe.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(() => {
              const tier: PlanTier = 'starter';
              const info = PLAN_DISPLAY[tier];
              const isCurrent = active && currentTier === tier;
              return (
                <div className="rounded-md border bg-muted/30 p-4 flex flex-col">
                  <h3 className="font-semibold">{info.name}</h3>
                  <p className="mt-1 text-lg font-medium">{info.price}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{info.description}</p>
                  <div className="mt-4 flex-1" />
                  {isCurrent ? (
                    <span className="text-sm text-muted-foreground">Current plan</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckout(tier)}
                      disabled={!!actionLoading}
                      className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {actionLoading === tier ? 'Redirecting…' : 'Subscribe'}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2. Current plan */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-medium">Current plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {active && currentTier
            ? `${PLAN_DISPLAY[currentTier].name} — ${billing?.planStatus ?? 'active'}`
            : 'Free (no active subscription)'}
        </p>
        {active && canManage && (
          <button
            type="button"
            onClick={handlePortal}
            disabled={!!actionLoading}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {actionLoading === 'portal' ? 'Opening…' : 'Manage Billing'}
          </button>
        )}
      </div>

      {/* 3. Invoices from payments (linked to plan) */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <h2 className="font-medium p-4 pb-2">Invoices</h2>
        <p className="px-4 text-sm text-muted-foreground">Paid invoices for your subscription.</p>
        {invoices.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-3">Date</th>
                  <th className="text-left font-medium p-3">Plan</th>
                  <th className="text-left font-medium p-3">Amount</th>
                  <th className="text-right font-medium p-3">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="p-3">{formatInvoiceDate(inv.created)}</td>
                    <td className="p-3">{inv.planName}</td>
                    <td className="p-3">{formatAmount(inv.amountPaid, inv.currency)}</td>
                    <td className="p-3 text-right">
                      {inv.hostedInvoiceUrl ? (
                        <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View
                        </a>
                      ) : inv.invoicePdf ? (
                        <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          PDF
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!canManage && (
        <p className="text-sm text-muted-foreground">
          Only the organisation owner can change the subscription. Contact them to upgrade or manage billing.
        </p>
      )}
    </div>
  );
}
