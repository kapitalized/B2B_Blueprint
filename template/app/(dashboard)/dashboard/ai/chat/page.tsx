'use client';

import { useState } from 'react';

/**
 * AI Chat — split view with chat histories.
 * Left: conversation list (or thread list). Right: active chat + source doc preview (split).
 */
export default function AIChatPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-xl bg-card overflow-hidden">
      {/* Left: Chat histories */}
      <aside className="w-64 border-r flex flex-col bg-muted/20">
        <div className="p-3 border-b">
          <h2 className="font-semibold text-sm">Chat history</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Conversations appear here</p>
        </div>
        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => setSelectedId('1')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedId === '1' ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}
            >
              New conversation
            </button>
          </li>
          {/* Wire to real chat list when backend is ready */}
        </ul>
      </aside>

      {/* Right: Split — chat + source doc */}
      <div className="flex-1 flex min-w-0">
        <section className="flex-1 flex flex-col border-r min-w-0">
          <div className="p-3 border-b text-sm font-medium">Chat</div>
          <div className="flex-1 overflow-y-auto p-4 text-muted-foreground text-sm">
            Split view: this panel = messages; right panel = source document preview (PDF/image). Wire to your chat API and doc viewer.
          </div>
          <div className="p-3 border-t">
            <input
              type="text"
              placeholder="Ask about this document..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              readOnly
            />
          </div>
        </section>
        <section className="w-80 flex flex-col bg-muted/10">
          <div className="p-3 border-b text-sm font-medium">Source document</div>
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
            PDF or image preview. Click-to-cite: clicking a report line highlights the region here.
          </div>
        </section>
      </div>
    </div>
  );
}
