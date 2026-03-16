'use client';

import { useEffect, useState } from 'react';

interface EnvVar {
  name: string;
  set: boolean;
  preview: string;
}

export function EnvView() {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/env', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { vars: EnvVar[] }) => setVars(data.vars))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Environment (.env.local / Vercel)</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Read-only view of env vars (values masked). Edit in <code className="rounded bg-muted px-1">.env.local</code> or Vercel project settings.
      </p>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Variable</th>
              <th className="p-2 text-left font-medium">Status</th>
              <th className="p-2 text-left font-medium">Preview</th>
            </tr>
          </thead>
          <tbody>
            {vars.map((v) => (
              <tr key={v.name} className="border-b last:border-0">
                <td className="p-2 font-mono text-xs">{v.name}</td>
                <td className="p-2">{v.set ? <span className="text-green-600">Set</span> : <span className="text-muted-foreground">Not set</span>}</td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{v.set ? v.preview : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
