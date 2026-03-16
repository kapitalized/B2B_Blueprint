'use client';

import { useEffect, useState } from 'react';

type Column = { name: string; type: string; nullable: boolean };
type Table = { name: string; columns: Column[] };
type Schema = { name: string; tables: Table[] };

export function DatabaseView() {
  const [data, setData] = useState<{ schemas: Schema[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/database', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d.error || 'Failed to load')))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;
  if (!data?.schemas?.length) return <p className="text-muted-foreground">No schemas returned. Check DATABASE_URL and permissions.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Database</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Neon database schemas and tables (from information_schema). Read-only.
      </p>
      <div className="mt-4 space-y-6">
        {data.schemas.map((schema) => (
          <div key={schema.name} className="rounded border">
            <h2 className="border-b bg-muted/50 px-3 py-2 font-semibold">{schema.name}</h2>
            <ul className="divide-y">
              {schema.tables.map((table) => (
                <li key={`${schema.name}.${table.name}`} className="px-3 py-2">
                  <span className="font-mono text-sm font-medium">{table.name}</span>
                  {table.columns.length > 0 && (
                    <ul className="mt-1 ml-4 text-xs text-muted-foreground">
                      {table.columns.map((col) => (
                        <li key={col.name}>
                          <span className="font-mono">{col.name}</span>
                          <span className="mx-1">:</span>
                          <span>{col.type}</span>
                          {col.nullable && <span className="ml-1">(nullable)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
