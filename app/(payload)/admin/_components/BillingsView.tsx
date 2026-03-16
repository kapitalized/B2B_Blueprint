'use client';

import { useEffect, useState } from 'react';
import type { AdminInvoiceRow } from '@/lib/billing/invoices';

export function BillingsView() {
  const [rows, setRows] = useState<AdminInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/billings?limit=100', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Billings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Invoices that users have paid. Open PDF or hosted invoice for details.
      </p>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Date</th>
              <th className="p-2 text-left font-medium">Number</th>
              <th className="p-2 text-left font-medium">Customer</th>
              <th className="p-2 text-left font-medium">Plan</th>
              <th className="p-2 text-right font-medium">Amount</th>
              <th className="p-2 text-left font-medium">Links</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No paid invoices yet. Ensure Stripe is configured and payments have been made.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2 text-muted-foreground">
                    {r.created ? new Date(r.created * 1000).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-2 font-mono text-xs">{r.number ?? r.id.slice(0, 20)}</td>
                  <td className="p-2">{r.customerEmail ?? r.customerId ?? '—'}</td>
                  <td className="p-2">{r.planName}</td>
                  <td className="p-2 text-right">
                    {(r.amountPaid / 100).toFixed(2)} {r.currency}
                  </td>
                  <td className="p-2">
                    <span className="flex flex-wrap gap-2">
                      {r.hostedInvoiceUrl && (
                        <a
                          href={r.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      )}
                      {r.invoicePdf && (
                        <a
                          href={r.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          PDF
                        </a>
                      )}
                      {!r.hostedInvoiceUrl && !r.invoicePdf && '—'}
                    </span>
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
