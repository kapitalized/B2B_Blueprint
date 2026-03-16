'use client';

import { useEffect, useState, useCallback } from 'react';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

const FIELDS = ['title', 'slug', 'metaTitle', 'metaDescription', 'metaKeywords'] as const;
const HEADERS = ['Page name', 'URL', 'SEO title', 'SEO description', 'SEO keywords'];

export function PagesSEOView() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; field: (typeof FIELDS)[number] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/pages', { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = (data as { error?: string }).error || r.statusText || 'Failed to load';
          throw new Error(typeof msg === 'string' ? msg : 'Failed to load');
        }
        return data as PageRow[];
      })
      .then(setPages)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to fetch. Check console and that you are logged in as admin.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCell = useCallback(
    async (id: string, field: (typeof FIELDS)[number], value: string) => {
      setEditing(null);
      const prev = pages.find((p) => p.id === id);
      if (!prev || prev[field] === value) return;

      setSaving(true);
      try {
        const res = await fetch(`/api/admin/pages/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ [field]: value }),
        });
        if (!res.ok) throw new Error('Save failed');
        const updated = (await res.json()) as PageRow;
        setPages((list) => list.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      } catch {
        setError('Failed to save. Try again.');
      } finally {
        setSaving(false);
      }
    },
    [pages]
  );

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/seed-pages', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Seed failed');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Pages &amp; SEO</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Click a cell to edit. Changes save when you blur or press Enter. Includes all pages (CMS and seeded).
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        To add any missing default pages (e.g. Privacy, Terms),{' '}
        <button type="button" className="text-primary underline" onClick={handleSeed} disabled={seeding}>
          {seeding ? 'Seeding…' : 'add missing default pages'}
        </button>
        . Existing slugs are skipped.
      </p>
      {saving && <p className="mt-2 text-xs text-amber-600">Saving…</p>}
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {HEADERS.map((h) => (
                <th key={h} className="p-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="p-6 text-center text-muted-foreground">
                  No pages. Create one in the &quot;Pages&quot; collection (sidebar) or{' '}
                  <button type="button" className="text-primary underline" onClick={handleSeed} disabled={seeding}>
                    {seeding ? 'Seeding…' : 'seed default pages'}
                  </button>.
                </td>
              </tr>
            ) : (
              pages.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  {FIELDS.map((field) => {
                    const isEditing = editing?.id === row.id && editing?.field === field;
                    const value = row[field] ?? '';

                    return (
                      <td key={field} className="p-0">
                        {isEditing ? (
                          <input
                            autoFocus
                            className="w-full min-w-[120px] border-0 bg-background p-2 outline-none ring-1 ring-inset ring-primary"
                            defaultValue={value}
                            onBlur={(e) => saveCell(row.id, field, e.target.value.trim())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                              if (e.key === 'Escape') {
                                setEditing(null);
                              }
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="w-full min-w-[120px] cursor-text p-2 text-left hover:bg-muted/50"
                            onClick={() => setEditing({ id: row.id, field })}
                          >
                            {value || '—'}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
