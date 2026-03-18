'use client';

/**
 * Dashboard home: list projects and create new one. Edit project (description, country, status) via modal.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { projectPath, projectSubPath } from '@/lib/project-url';
import { PROJECT_STATUS_OPTIONS } from '@/lib/project-form-options';
import type { Address } from '@/lib/address';
import { EMPTY_ADDRESS, parseAddress } from '@/lib/address';
import { AddressForm } from '@/components/AddressForm';

interface Project {
  id: string;
  projectName: string;
  projectAddress?: string | null;
  address?: Address;
  projectDescription?: string | null;
  projectObjectives?: string | null;
  country?: string | null;
  projectStatus?: string | null;
  status?: string | null;
  createdAt?: string | null;
  shortId?: string | null;
  slug?: string | null;
  numberOfLevels?: number | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState<Address>({ ...EMPTY_ADDRESS });
  const [newDescription, setNewDescription] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState('');
  const [newNumberOfLevels, setNewNumberOfLevels] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState<Address>({ ...EMPTY_ADDRESS });
  const [editDescription, setEditDescription] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState('');
  const [editNumberOfLevels, setEditNumberOfLevels] = useState(1);
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
          setEditAddress(p.address ? { ...p.address } : parseAddress(p.projectAddress ?? ''));
          setEditDescription(p.projectDescription ?? '');
          setEditProjectStatus(p.projectStatus ?? '');
          setEditNumberOfLevels(p.numberOfLevels ?? 1);
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
    setEditAddress(project.address ? { ...project.address } : parseAddress(project.projectAddress ?? ''));
    setEditDescription(project.projectDescription ?? '');
    setEditProjectStatus(project.projectStatus ?? '');
    setEditNumberOfLevels(project.numberOfLevels ?? 1);
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
          address: editAddress,
          projectDescription: editDescription.trim().slice(0, 500) || undefined,
          projectStatus: editProjectStatus.trim() || undefined,
          numberOfLevels: editNumberOfLevels,
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
          address: newAddress,
          projectDescription: newDescription.trim().slice(0, 500) || undefined,
          projectStatus: newProjectStatus.trim() || undefined,
          numberOfLevels: newNumberOfLevels,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to create project.');
        return;
      }
      setNewName('');
      setNewAddress({ ...EMPTY_ADDRESS });
      setNewDescription('');
      setNewProjectStatus('');
      setNewNumberOfLevels(1);
      await load();
    } catch {
      setError('Failed to create project.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage projects and run AI analysis.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* Left: Projects list */}
        <section className="min-w-0">
          <h2 className="font-semibold text-lg mb-2">Projects</h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="text-muted-foreground text-sm">No projects yet. Create one in the form on the right.</p>
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
                      {([p.country, p.projectStatus, (p.numberOfLevels != null && p.numberOfLevels >= 1) ? `${p.numberOfLevels} level${p.numberOfLevels !== 1 ? 's' : ''}` : null].filter(Boolean).length > 0) && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {[p.country, p.projectStatus, (p.numberOfLevels != null && p.numberOfLevels >= 1) ? `${p.numberOfLevels} level${p.numberOfLevels !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {p.projectDescription && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.projectDescription}</p>}
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
                      <Link href={projectSubPath(p, 'quantities')} className="text-sm text-primary hover:underline">
                        Quantities
                      </Link>
                      <Link href={projectSubPath(p, 'analyse')} className="text-sm text-primary hover:underline">
                        Analyse
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

        {/* Right: Create new project */}
        <section className="lg:max-w-[400px]">
          <h2 className="font-semibold text-lg mb-2">New project</h2>
          <form onSubmit={createProject} className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Name</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                className="rounded-md border border-input bg-background px-3 py-2 w-full text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Address (optional)</span>
              <AddressForm value={newAddress} onChange={setNewAddress} labelPrefix="Project" compact />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Description (optional)</span>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short description"
                maxLength={500}
                className="rounded-md border border-input bg-background px-3 py-2 w-full text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Number of levels</span>
              <select
                value={newNumberOfLevels}
                onChange={(e) => setNewNumberOfLevels(Number(e.target.value))}
                className="rounded-md border border-input bg-background px-3 py-2 w-full text-foreground"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n} level{n !== 1 ? 's' : ''}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Status of project</span>
              <select
                value={newProjectStatus}
                onChange={(e) => setNewProjectStatus(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 w-full text-foreground"
              >
                {PROJECT_STATUS_OPTIONS.map((s) => (
                  <option key={s || 'blank'} value={s}>{s || 'Select status'}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50 w-full"
            >
              {creating ? 'Creating…' : 'Create project'}
            </button>
          </form>
        </section>
      </div>

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
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Address</span>
                <AddressForm value={editAddress} onChange={setEditAddress} labelPrefix="Project" compact />
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Description</span>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={500}
                  className="rounded-md border border-input bg-background px-3 py-2 text-foreground w-full"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Number of levels</span>
                <select
                  value={editNumberOfLevels}
                  onChange={(e) => setEditNumberOfLevels(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-3 py-2 text-foreground w-full"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>{n} level{n !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Status of project</span>
                <select
                  value={editProjectStatus}
                  onChange={(e) => setEditProjectStatus(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-foreground w-full"
                >
                  {PROJECT_STATUS_OPTIONS.map((s) => (
                    <option key={s || 'blank'} value={s}>{s || 'Select status'}</option>
                  ))}
                </select>
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
