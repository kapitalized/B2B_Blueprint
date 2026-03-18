'use client';

/**
 * AI Chat content — project selector, thread list, messages, send with RAG.
 * Used by dashboard/ai/chat page and by project chat page.
 */
import { useEffect, useState, useCallback } from 'react';
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

interface ReportOption {
  id: string;
  reportTitle: string;
  reportType: string;
  createdAt: string | null;
}

export interface AIChatContentProps {
  /** When set (e.g. from /project/shortId/slug/chat), use this project and hide selector */
  initialProjectId?: string;
  /** File IDs to include in chat reference (when set, only these are sent; otherwise backend uses all). */
  referenceFileIds?: string[];
  /** Report IDs to include in chat reference (when set, only these are sent; otherwise backend uses last 10). */
  referenceReportIds?: string[];
}

function ThreadItem({
  thread,
  isSelected,
  onSelect,
  onRename,
}: {
  thread: Thread;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thread.title);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === thread.title) {
      setEditing(false);
      setDraft(thread.title);
      return;
    }
    try {
      const res = await fetch(`/api/chat/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        onRename(trimmed);
      }
    } finally {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <li className="px-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') { setEditing(false); setDraft(thread.title); }
          }}
          autoFocus
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground"
        />
      </li>
    );
  }

  return (
    <li>
      <div
        className={`group flex items-center gap-1 w-full text-left px-3 py-2 rounded-lg text-sm truncate ${isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 min-w-0 truncate text-left"
        >
          {thread.title}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDraft(thread.title); setEditing(true); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground"
          title="Rename"
        >
          <span className="sr-only">Rename</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7 17 4 20 3 19 16 6 4 4z"/></svg>
        </button>
      </div>
    </li>
  );
}

export function AIChatContent({ initialProjectId, referenceFileIds, referenceReportIds }: AIChatContentProps = {}) {
  const searchParams = useSearchParams();
  const projectIdParam = initialProjectId ?? searchParams.get('projectId');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(projectIdParam ?? '');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [addingMessageId, setAddingMessageId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const selectedReport = reports.find((r) => r.id === selectedReportId);

  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (initialProjectId) setProjectId(initialProjectId);
        else if (!projectId && list.length > 0) setProjectId(list[0].id);
        else if (projectIdParam && list.some((p: Project) => p.id === projectIdParam)) setProjectId(projectIdParam);
      })
      .catch(() => setProjects([]));
  }, [projectIdParam, initialProjectId]);

  const loadThreads = useCallback(() => {
    if (!projectId) return setThreads([]);
    fetch(`/api/projects/${projectId}/chat/threads`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setThreads(Array.isArray(data) ? data : []))
      .catch(() => setThreads([]));
  }, [projectId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (!projectId || !initialProjectId) return setReports([]);
    fetch(`/api/projects/${projectId}/reports`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]));
  }, [projectId, initialProjectId]);

  useEffect(() => {
    setEditingTitle(false);
    setTitleDraft('');
  }, [selectedThreadId]);

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

  async function addToQuantities(messageId: string, content: string) {
    if (!projectId || addingMessageId) return;
    setAddingMessageId(messageId);
    setAddError(null);
    try {
      const title = selectedReport ? `${selectedReport.reportTitle} (revised)` : undefined;
      const res = await fetch(`/api/projects/${projectId}/reports/from-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentMarkdown: content, reportTitle: title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError((data as { error?: string }).error ?? 'Failed to add to Quantities');
        return;
      }
      setReports((prev) => [...prev, { id: (data as { reportId: string }).reportId, reportTitle: (data as { reportTitle: string }).reportTitle, reportType: 'quantity_takeoff', createdAt: new Date().toISOString() }]);
    } catch {
      setAddError('Failed to add to Quantities');
    } finally {
      setAddingMessageId(null);
    }
  }

  async function renameThread(newTitle: string) {
    if (!selectedThreadId || !newTitle.trim()) return;
    const trimmed = newTitle.trim();
    try {
      const res = await fetch(`/api/chat/threads/${selectedThreadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        setThreads((prev) => prev.map((t) => (t.id === selectedThreadId ? { ...t, title: trimmed } : t)));
      }
    } finally {
      setEditingTitle(false);
      setTitleDraft('');
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
        body: JSON.stringify({
        content: text,
        reportId: selectedReportId || undefined,
        fileIds: referenceFileIds,
        reportIds: referenceReportIds,
      }),
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
        {!initialProjectId && (
          <>
            <label className="text-sm font-medium shrink-0">Project</label>
            <select
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setSelectedThreadId(null); }}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm flex-1 max-w-xs text-foreground"
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectName}</option>
              ))}
            </select>
          </>
        )}
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
              <ThreadItem
                key={t.id}
                thread={t}
                isSelected={selectedThreadId === t.id}
                onSelect={() => setSelectedThreadId(t.id)}
                onRename={(title) => {
                  setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, title } : x)));
                }}
              />
            ))}
          </ul>
        </aside>
        <section className="flex-1 flex flex-col min-w-0">
          <div className="p-3 border-b text-sm font-medium flex items-center gap-2">
            {selectedThreadId ? (
              editingTitle ? (
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => renameThread(titleDraft)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') renameThread(titleDraft);
                    if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(''); }
                  }}
                  autoFocus
                  className="flex-1 min-w-0 rounded border border-input bg-background px-2 py-1 text-foreground"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(selectedThread?.title ?? '');
                    setEditingTitle(true);
                  }}
                  className="text-left truncate hover:underline"
                >
                  {selectedThread?.title ?? 'Chat'}
                </button>
              )
            ) : (
              'Select or create a chat'
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {addError && (
              <div className="rounded-lg px-3 py-2 text-sm bg-destructive/10 text-destructive">
                {addError}
                <button type="button" onClick={() => setAddError(null)} className="ml-2 underline">Dismiss</button>
              </div>
            )}
            {!selectedThreadId && (
              <p className="text-muted-foreground text-sm">Choose a thread or create a new chat.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
                <div className={`rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.content}
                </div>
                {m.role === 'assistant' && initialProjectId && projectId && (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addToQuantities(m.id, m.content)}
                      disabled={!!addingMessageId}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {addingMessageId === m.id ? 'Adding…' : 'Add to Quantities'}
                    </button>
                    {addingMessageId === m.id ? null : (
                      <span className="text-xs text-muted-foreground">Saves revised measurements to Quantities page</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {selectedThreadId && (
            <form onSubmit={sendMessage} className="p-3 border-t space-y-2">
              {initialProjectId && reports.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground shrink-0">Refine a report (optional)</label>
                  <select
                    value={selectedReportId}
                    onChange={(e) => setSelectedReportId(e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground max-w-[280px] truncate"
                  >
                    <option value="">None</option>
                    {reports.map((r) => (
                      <option key={r.id} value={r.id} title={r.reportTitle}>{r.reportTitle}</option>
                    ))}
                  </select>
                  {selectedReport && (
                    <span className="text-xs text-muted-foreground">Ask to fix missing areas or errors</span>
                  )}
                </div>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedReportId ? 'e.g. Fix the report for missing areas, or correct Living room to 28 m²' : 'Ask about this project...'}
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
