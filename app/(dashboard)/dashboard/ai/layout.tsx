import Link from 'next/link';
import { Suspense } from 'react';

export default function AILayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <nav className="flex gap-1 border-b border-border/60 pb-3 mb-4">
        <Link
          href="/dashboard/ai/chat"
          className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          Chat
        </Link>
        <Link
          href="/dashboard/ai/analyse"
          className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          Analyse
        </Link>
        <Link
          href="/dashboard/ai/documents"
          className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          Documents
        </Link>
        <Link
          href="/dashboard/ai/floorplan-test"
          className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          Floorplan test
        </Link>
      </nav>
      <div className="flex-1 min-h-0">
        <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
