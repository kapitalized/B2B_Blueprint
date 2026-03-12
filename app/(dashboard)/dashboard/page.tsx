'use client';

/**
 * Dashboard home: list projects and create new one.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  projectName: string;
  projectAddress?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [creating, setCreating] = useState(false);

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

  useEffect(() => { load(); }, []);

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
        body: JSON.stringify({ projectName: newName.trim(), projectAddress: newAddress.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to create project.');
        return;
      }
      setNewName('');
      setNewAddress('');
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
              className="rounded-md border px-3 py-2 w-48"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Address (optional)</span>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Address"
              className="rounded-md border px-3 py-2 w-56"
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
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.projectName}</p>
                  {p.projectAddress && <p className="text-xs text-muted-foreground truncate">{p.projectAddress}</p>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/ai/documents?projectId=${p.id}`} className="text-sm text-primary hover:underline">
                    Documents
                  </Link>
                  <Link href={`/dashboard/ai/reports?projectId=${p.id}`} className="text-sm text-primary hover:underline">
                    Reports
                  </Link>
                  <Link href={`/dashboard/ai/chat?projectId=${p.id}`} className="text-sm text-primary hover:underline">
                    Chat
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
