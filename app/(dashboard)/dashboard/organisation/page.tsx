'use client';

/**
 * Organisation page: name, unique ID (slug), address (line1, line2, postcode, state, country). Editable by owner/admin.
 */
import { useEffect, useState } from 'react';
import type { Address } from '@/lib/address';
import { EMPTY_ADDRESS } from '@/lib/address';
import { AddressForm } from '@/components/AddressForm';

interface Org {
  id: string;
  name: string;
  slug: string;
  fullAddress: string | null;
  address?: Address;
  type: string;
  createdAt?: string;
}

export default function OrganisationPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState<Address>({ ...EMPTY_ADDRESS });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/org/current', { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
        const data = await res.json();
        setOrg(data);
        setEditName(data.name ?? '');
        setEditAddress(data.address ? { ...data.address } : { ...EMPTY_ADDRESS });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load organisation');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/org/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName.trim(), address: editAddress }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      const data = await res.json();
      setOrg(data);
      setEditName(data.name ?? '');
      setEditAddress(data.address ? { ...data.address } : { ...EMPTY_ADDRESS });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Organisation</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error && !org) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Organisation</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Organisation</h1>
        <p className="mt-2 text-muted-foreground">No organisation found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Organisation</h1>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Organisation name"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Organisation ID</label>
          <p className="mt-1 text-sm font-mono text-muted-foreground">{org.slug}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Org name + 10-character code (e.g. my-company-a1b2c3d4e5). Unique identifier for this organisation.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (!org || saving) return;
              setSaving(true);
              setError(null);
              try {
                const res = await fetch('/api/org/current', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ regenerateSlug: true }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error || res.statusText);
                }
                const data = await res.json();
                setOrg(data);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to regenerate ID');
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className="mt-2 text-sm text-primary hover:underline disabled:opacity-50"
          >
            Regenerate ID
          </button>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Address (line 1, line 2, postcode, state/province, country)</h3>
          <AddressForm value={editAddress} onChange={setEditAddress} labelPrefix="Organisation" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
