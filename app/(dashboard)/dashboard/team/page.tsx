'use client';

/**
 * Team page: list members (email, role, date added), add new member by email + role.
 */
import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/format-date';

interface Member {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'analyst'>('analyst');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/org/current/members', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      const data = await res.json();
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = addEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/org/current/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, role: addRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      setAddEmail('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/org/current/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  }

  const formatMemberDate = (s: string) => {
    try {
      return formatDate(s);
    } catch {
      return s;
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Team</h1>
      <p className="text-muted-foreground">Organisation members and roles.</p>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Add member */}
      <form onSubmit={handleAdd} className="rounded-lg border bg-card p-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label className="block text-sm font-medium text-muted-foreground">Email</label>
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Role</label>
          <select
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as 'admin' | 'analyst')}
            className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add member'}
        </button>
      </form>

      {/* Members list */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 text-muted-foreground">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-4 text-muted-foreground">No members yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium p-3">Email</th>
                <th className="text-left font-medium p-3">Role</th>
                <th className="text-left font-medium p-3">Date added</th>
                <th className="w-24 p-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId} className="border-b last:border-0">
                  <td className="p-3">{m.email}</td>
                  <td className="p-3 capitalize">{m.role}</td>
                  <td className="p-3 text-muted-foreground">{formatMemberDate(m.joinedAt)}</td>
                  <td className="p-3">
                    {m.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemove(m.userId)}
                        disabled={removingId === m.userId}
                        className="text-destructive hover:underline text-xs disabled:opacity-50"
                      >
                        {removingId === m.userId ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
