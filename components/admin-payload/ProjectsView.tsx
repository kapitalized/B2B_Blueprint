'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    fetch('/api/admin/projects?limit=100', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Projects</h1>
      <p className="mt-1 text-sm text-muted-foreground">App projects (construction) from the database.</p>
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
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No projects.</td></tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-2">{p.projectName}</td>
                  <td className="p-2">{p.projectAddress ?? '—'}</td>
                  <td className="p-2">{p.shortId ?? '—'}</td>
                  <td className="p-2">{p.userEmail}</td>
                  <td className="p-2">{p.status ?? '—'}</td>
                  <td className="p-2">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
