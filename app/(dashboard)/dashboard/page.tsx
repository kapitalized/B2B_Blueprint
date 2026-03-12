'use client';

/**
 * Dashboard home: list projects and create new one. Edit project (description, objectives) via modal.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { projectPath, projectSubPath } from '@/lib/project-url';

interface Project {
  id: string;
  projectName: string;
  projectAddress?: string | null;
  projectDescription?: string | null;
  projectObjectives?: string | null;
  status?: string | null;
  createdAt?: string | null;
  shortId?: string | null;
  slug?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newObjectives, setNewObjectives] = useState('');
  const [creating, setCreating] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editObjectives, setEditObjectives] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login?next=/dashboard&reason=session');
          return;
        }
        setError('Failed to load projects.');
        return;
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }

  const searchParams = useSearchParams();
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = searchParams.get('editProject');
    if (!id) return;
    setEditProjectId(id);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${id}`, { credentials: 'include' });
        if (!cancelled && res.ok) {
          const p = await res.json();
          setEditName(p.projectName ?? '');
          setEditAddress(p.projectAddress ?? '');
          setEditDescription(p.projectDescription ?? '');
          setEditObjectives(p.projectObjectives ?? '');
        }
      } catch {
        if (!cancelled) setEditProjectId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams]);
  async function loadEditForm(project: Project) {
    setEditProjectId(project.id);
    setEditName(project.projectName ?? '');
    setEditAddress(project.projectAddress ?? '');
    setEditDescription(project.projectDescription ?? '');
    setEditObjectives(project.projectObjectives ?? '');
  }
  async function saveEdit() {
    if (!editProjectId || savingEdit) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${editProjectId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: editName.trim() || undefined,
          projectAddress: editAddress.trim() || undefined,
          projectDescription: editDescription.trim().slice(0, 500) || undefined,
          projectObjectives: editObjectives.trim().slice(0, 2000) || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to update project.');
        return;
      }
      setEditProjectId(null);
      await load();
    } catch {
      setError('Failed to update project.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: newName.trim(),
          projectAddress: newAddress.trim() || undefined,
          projectDescription: newDescription.trim().slice(0, 500) || undefined,
          projectObjectives: newObjectives.trim().slice(0, 2000) || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to create project.');
        return;
      }
      setNewName('');
      setNewAddress('');
      setNewDescription('');
      setNewObjectives('');
      await load();
    } catch {
      setError('Failed to create project.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Manage projects and run AI analysis.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section>
        <h2 className="font-semibold text-lg mb-2">New project</h2>
        <form onSubmit={createProject} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Name</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="rounded-md border border-input bg-background px-3 py-2 w-48 text-foreground placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Location (optional)</span>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Location"
              className="rounded-md border border-input bg-background px-3 py-2 w-56 text-foreground placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Description (optional)</span>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Short description"
              maxLength={500}
              className="rounded-md border border-input bg-background px-3 py-2 w-64 text-foreground placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Objectives (optional)</span>
            <textarea
              value={newObjectives}
              onChange={(e) => setNewObjectives(e.target.value)}
              placeholder="e.g. Villa on Spanish coast, have design but no builder, want cost estimates from drawings"
              maxLength={2000}
              rows={2}
              className="rounded-md border border-input bg-background px-3 py-2 w-96 text-foreground placeholder:text-muted-foreground resize-y"
            />
          </label>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-2">Projects</h2>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">No projects yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => {
              const projectUrl = p.shortId && p.slug ? `/project/${p.shortId}/${p.slug}` : null;
              return (
                <li key={p.id} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      <Link href={projectPath(p)} className="text-foreground hover:underline">
                        {p.projectName}
                      </Link>
                    </p>
                    {p.projectAddress && <p className="text-xs text-muted-foreground truncate">{p.projectAddress}</p>}
                    {p.projectDescription && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.projectDescription}</p>}
                    {p.projectObjectives && <p className="text-xs text-muted-foreground truncate mt-0.5" title={p.projectObjectives}>{p.projectObjectives}</p>}
                    {projectUrl && (
                      <p className="mt-1.5 text-xs text-muted-foreground font-mono truncate" title={projectUrl}>
                        {projectUrl}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => loadEditForm(p)} className="text-sm text-primary hover:underline">
                      Edit
                    </button>
                    <Link href={projectPath(p)} className="text-sm text-primary hover:underline">
                      Open
                    </Link>
                    <Link href={projectSubPath(p, 'documents')} className="text-sm text-primary hover:underline">
                      Documents
                    </Link>
                    <Link href={projectSubPath(p, 'reports')} className="text-sm text-primary hover:underline">
                      Reports
                    </Link>
                    <Link href={projectSubPath(p, 'chat')} className="text-sm text-primary hover:underline">
                      Chat
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-background border rounded-lg shadow-lg p-4 max-w-lg w-full mx-2 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-3">Edit project</h3>
            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Name</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Location</span>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Description</span>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={500}
                  className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Objectives (what you want to achieve)</span>
                <textarea
                  value={editObjectives}
                  onChange={(e) => setEditObjectives(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="e.g. Villa on Spanish coast, have design but no builder, want cost estimates from drawings"
                  className="rounded-md border border-input bg-background px-3 py-2 text-foreground resize-y"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {savingEdit ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditProjectId(null)}
                className="rounded-md border border-input px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
