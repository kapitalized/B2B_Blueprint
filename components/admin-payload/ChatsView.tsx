'use client';

import { useEffect, useState } from 'react';

interface ChatRow {
  id: string;
  title: string;
  lastActivity: string | null;
  projectName: string;
  projectShortId: string | null;
  userEmail: string;
}

export function ChatsView() {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/chats?limit=100', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setChats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Chats</h1>
      <p className="mt-1 text-sm text-muted-foreground">Chat threads by project and user.</p>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Title</th>
              <th className="p-2 text-left font-medium">Project</th>
              <th className="p-2 text-left font-medium">User</th>
              <th className="p-2 text-left font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {chats.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No chats.</td></tr>
            ) : (
              chats.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-2">{c.title}</td>
                  <td className="p-2">{c.projectName} {c.projectShortId ? `(${c.projectShortId})` : ''}</td>
                  <td className="p-2">{c.userEmail}</td>
                  <td className="p-2">{c.lastActivity ? new Date(c.lastActivity).toLocaleString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
