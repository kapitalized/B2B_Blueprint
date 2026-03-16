'use client';

import { useEffect, useState, useMemo } from 'react';
import { formatDate } from '@/lib/format-date';

interface AppUserRow {
  id: string;
  email: string;
  planType: string;
  totalStorageUsed: number;
  createdAt: string | null;
}

export function AppUsersView() {
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('');

  useEffect(() => {
    fetch('/api/admin/app-users?limit=500', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const planTypes = useMemo(() => Array.from(new Set(users.map((u) => u.planType).filter(Boolean))).sort(), [users]);
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (emailFilter.trim() && !u.email.toLowerCase().includes(emailFilter.trim().toLowerCase())) return false;
      if (planFilter && u.planType !== planFilter) return false;
      return true;
    });
  }, [users, emailFilter, planFilter]);

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">App users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Users who sign in to the app (Neon/Supabase). For CMS admins, use the &quot;Admin users&quot; collection in the sidebar.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter by email"
          className="rounded border px-2 py-1.5 text-sm w-48"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
        />
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
        >
          <option value="">All plans</option>
          {planTypes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} of {users.length}</span>
      </div>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Email</th>
              <th className="p-2 text-left font-medium">Plan</th>
              <th className="p-2 text-right font-medium">Storage used</th>
              <th className="p-2 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{users.length === 0 ? 'No app users yet.' : 'No users match the filter.'}</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.planType}</td>
                  <td className="p-2 text-right">{u.totalStorageUsed.toLocaleString()} B</td>
                  <td className="p-2">{u.createdAt ? formatDate(u.createdAt) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
