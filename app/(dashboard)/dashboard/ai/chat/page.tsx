'use client';

/**
 * AI Chat — project selector, thread list, messages, send with RAG over project analyses.
 */
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

interface Project {
  id: string;
  projectName: string;
}

interface Thread {
  id: string;
  title: string;
  lastActivity: string | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string | null;
}

function AIChatContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(projectIdParam ?? '');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (!projectId && list.length > 0) setProjectId(list[0].id);
        if (projectIdParam && list.some((p: Project) => p.id === projectIdParam)) setProjectId(projectIdParam);
      })
      .catch(() => setProjects([]));
  }, [projectIdParam]);

  const loadThreads = useCallback(() => {
    if (!projectId) return setThreads([]);
    fetch(`/api/projects/${projectId}/chat/threads`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setThreads(Array.isArray(data) ? data : []))
      .catch(() => setThreads([]));
  }, [projectId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (!selectedThreadId) return setMessages([]);
    fetch(`/api/chat/threads/${selectedThreadId}/messages`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]));
  }, [selectedThreadId]);

  async function createThread() {
    if (!projectId || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chat/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New chat' }),
      });
      if (res.ok) {
        const t = await res.json();
        setThreads((prev) => [t, ...prev]);
        setSelectedThreadId(t.id);
      }
    } finally {
      setCreating(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selectedThreadId || sending) return;
    setInput('');
    setSending(true);
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const res = await fetch(`/api/chat/threads/${selectedThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const assistant = await res.json();
        setMessages((prev) => [...prev, assistant]);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setInput(text);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-xl bg-card overflow-hidden">
      <div className="p-3 border-b flex items-center gap-3">
        <label className="text-sm font-medium shrink-0">Project</label>
        <select
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value); setSelectedThreadId(null); }}
          className="rounded-md border px-3 py-1.5 text-sm flex-1 max-w-xs"
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.projectName}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={createThread}
          disabled={!projectId || creating}
          className="text-sm px-3 py-1.5 rounded-md border bg-primary text-primary-foreground disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'New chat'}
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <aside className="w-64 border-r flex flex-col bg-muted/20">
          <div className="p-3 border-b">
            <h2 className="font-semibold text-sm">Threads</h2>
          </div>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {threads.length === 0 && projectId && (
              <li className="text-xs text-muted-foreground px-2">No chats yet. Create one above.</li>
            )}
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedThreadId(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${selectedThreadId === t.id ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="flex-1 flex flex-col min-w-0">
          <div className="p-3 border-b text-sm font-medium">
            {selectedThreadId ? 'Chat' : 'Select or create a chat'}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!selectedThreadId && (
              <p className="text-muted-foreground text-sm">Choose a thread or create a new chat.</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                {m.content}
              </div>
            ))}
          </div>
          {selectedThreadId && (
            <form onSubmit={sendMessage} className="p-3 border-t">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this project..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                disabled={sending}
              />
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <AIChatContent />
    </Suspense>
  );
}
