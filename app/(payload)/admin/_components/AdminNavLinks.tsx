'use client';

import React from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '/admin', label: 'App monitoring' },
  { href: '/admin/app-users', label: 'App users' },
  { href: '/admin/ai-models', label: 'AI models (OpenRouter)' },
  { href: '/admin/run-logs', label: 'Run logs' },
  { href: '/admin/usage', label: 'Usage & cost' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/chats', label: 'Chats' },
  { href: '/admin/files', label: 'Files' },
];

export function AdminNavLinks() {
  return (
    <>
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </>
  );
}
