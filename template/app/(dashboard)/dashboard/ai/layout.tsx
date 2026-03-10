import Link from 'next/link';
import { BRAND } from '@/lib/brand';

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
          href="/dashboard/ai/reports"
          className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          Reports
        </Link>
        <Link
          href="/dashboard/ai/documents"
          className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          Documents
        </Link>
      </nav>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
