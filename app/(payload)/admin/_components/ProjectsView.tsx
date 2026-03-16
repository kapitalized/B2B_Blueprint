'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/format-date';

interface ProjectRow {
  id: string;
  projectName: string;
  projectAddress: string | null;
  shortId: string | null;
  slug: string | null;
  status: string | null;
  createdAt: string | null;
  userEmail: string;
}

export function ProjectsView() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filtered = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    const byStatus = statusFilter ? (p: ProjectRow) => (p.status ?? '') === statusFilter : () => true;
    const bySearch = q
      ? (p: ProjectRow) =>
          [p.projectName, p.projectAddress, p.userEmail, p.shortId, p.slug].some(
            (v) => v && String(v).toLowerCase().includes(q)
          )
      : () => true;
    return projects.filter((p) => byStatus(p) && bySearch(p));
  }, [projects, searchFilter, statusFilter]);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/projects?limit=100', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectName: editing.projectName,
          projectAddress: editing.projectAddress ?? '',
          slug: editing.slug ?? '',
          status: editing.status ?? 'active',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error || 'Save failed');
      }
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: ProjectRow) => {
    if (!confirm(`Delete project "${p.projectName}"? This may fail if it has files or reports.`)) return;
    try {
      const res = await fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error || 'Delete failed');
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  const viewHref = (p: ProjectRow) =>
    p.shortId && p.slug ? `/project/${p.shortId}/${p.slug}` : `/dashboard?editProject=${p.id}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Projects</h1>
      <p className="mt-1 text-sm text-muted-foreground">View, edit, or delete as super admin. View opens the app dashboard.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search name, address, owner…"
          className="rounded border px-2 py-1.5 text-sm w-56"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="archived">archived</option>
          <option value="completed">completed</option>
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} of {projects.length}</span>
      </div>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Name</th>
              <th className="p-2 text-left font-medium">Address</th>
              <th className="p-2 text-left font-medium">Short ID</th>
              <th className="p-2 text-left font-medium">Owner</th>
              <th className="p-2 text-left font-medium">Status</th>
              <th className="p-2 text-left font-medium">Created</th>
              <th className="p-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{projects.length === 0 ? 'No projects.' : 'No projects match the filter.'}</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-2">{editing?.id === p.id ? (
                    <input className="w-full rounded border px-1" value={editing.projectName} onChange={(e) => setEditing({ ...editing, projectName: e.target.value })} />
                  ) : (
                    p.projectName
                  )}</td>
                  <td className="p-2">{editing?.id === p.id ? (
                    <input className="w-full rounded border px-1" value={editing.projectAddress ?? ''} onChange={(e) => setEditing({ ...editing, projectAddress: e.target.value || null })} />
                  ) : (
                    p.projectAddress ?? '—'
                  )}</td>
                  <td className="p-2">{p.shortId ?? '—'}</td>
                  <td className="p-2">{p.userEmail}</td>
                  <td className="p-2">{editing?.id === p.id ? (
                    <select className="rounded border px-1" value={editing.status ?? 'active'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                      <option value="active">active</option>
                      <option value="archived">archived</option>
                      <option value="completed">completed</option>
                    </select>
                  ) : (
                    p.status ?? '—'
                  )}</td>
                  <td className="p-2">{p.createdAt ? formatDate(p.createdAt) : '—'}</td>
                  <td className="p-2">
                    {editing?.id === p.id ? (
                      <>
                        <button type="button" className="text-primary underline mr-2" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                        <button type="button" className="text-muted-foreground underline" onClick={() => setEditing(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <Link href={viewHref(p)} className="text-primary underline mr-2" target="_blank" rel="noopener noreferrer">View</Link>
                        <button type="button" className="text-primary underline mr-2" onClick={() => setEditing(p)}>Edit</button>
                        <button type="button" className="text-destructive hover:underline" onClick={() => handleDelete(p)}>Delete</button>
                      </>
                    )}
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
