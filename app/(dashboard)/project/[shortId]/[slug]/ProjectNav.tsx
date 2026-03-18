'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProject } from './ProjectProvider';

const baseLink = 'rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const activeLink = 'bg-primary text-primary-foreground';
const inactiveLink = 'text-muted-foreground hover:bg-muted hover:text-foreground';

export function ProjectNav({ shortId, slug }: { shortId: string; slug: string }) {
  const project = useProject();
  const pathname = usePathname();
  const base = `/project/${shortId}/${slug}`;
  const is = (segment: string) =>
    segment === '' ? pathname === base : pathname === `${base}/${segment}` || pathname.startsWith(`${base}/${segment}/`);
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b pb-2 mb-4">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground mr-2">
        ← Dashboard
      </Link>
      <span className="text-muted-foreground mr-2">/</span>
      <span className="font-medium text-foreground truncate max-w-[180px] mr-4">
        {project?.projectName ?? slug}
      </span>
      <Link href={base} className={`${baseLink} ${is('') ? activeLink : inactiveLink}`}>
        Overview
      </Link>
      <Link href={`${base}/documents`} className={`${baseLink} ${is('documents') ? activeLink : inactiveLink}`}>
        Documents
      </Link>
      <Link href={`${base}/quantities`} className={`${baseLink} ${is('quantities') ? activeLink : inactiveLink}`}>
        Quantities
      </Link>
      <Link href={`${base}/analyse`} className={`${baseLink} ${is('analyse') ? activeLink : inactiveLink}`}>
        Analyse
      </Link>
      <Link href={`${base}/chat`} className={`${baseLink} ${is('chat') ? activeLink : inactiveLink}`}>
        Chat
      </Link>
    </nav>
  );
}
