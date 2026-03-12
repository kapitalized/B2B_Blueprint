'use client';

import Link from 'next/link';
import { useProject } from './ProjectProvider';

export function ProjectNav({ shortId, slug }: { shortId: string; slug: string }) {
  const project = useProject();
  const base = `/project/${shortId}/${slug}`;
  return (
    <nav className="flex items-center gap-4 text-sm text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
      <span>/</span>
      <span className="font-medium text-foreground truncate max-w-[200px]">
        {project?.projectName ?? slug}
      </span>
      <Link href={`${base}/documents`} className="hover:text-foreground">Documents</Link>
      <Link href={`${base}/reports`} className="hover:text-foreground">Reports</Link>
      <Link href={`${base}/chat`} className="hover:text-foreground">Chat</Link>
    </nav>
  );
}
