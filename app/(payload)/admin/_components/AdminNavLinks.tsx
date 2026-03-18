'use client';

import React from 'react';
import Link from 'next/link';

/** Nav groups: Globals (App monitoring), Content, Users, Payments, then the rest. */
const SECTIONS: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: 'Globals',
    links: [
      { href: '/admin', label: 'App monitoring' },
      { href: '/admin/globals/site-settings', label: 'Site Settings' },
      { href: '/admin/collections/users', label: 'Admin users' },
      { href: '/admin/env', label: 'Environment' },
      { href: '/admin/external-apis', label: 'External APIs' },
    ],
  },
  {
    label: 'Content',
    links: [
      { href: '/admin/collections/pages', label: 'Pages' },
      { href: '/admin/pages-seo', label: 'Pages & SEO' },
    ],
  },
  {
    label: 'Users',
    links: [
      { href: '/admin/app-users', label: 'App users' },
      { href: '/admin/projects', label: 'Projects' },
      { href: '/admin/chats', label: 'Chats' },
      { href: '/admin/files', label: 'Files' },
    ],
  },
  {
    label: 'Payments',
    links: [
      { href: '/admin/stripe-plans', label: 'Stripe plans' },
      { href: '/admin/billing', label: 'Subscriptions' },
      { href: '/admin/billings', label: 'Billings' },
      { href: '/admin/coupons', label: 'Coupons' },
    ],
  },
  {
    label: 'Database',
    links: [{ href: '/admin/database', label: 'Schema & tables' }],
  },
  {
    label: 'AI & logs',
    links: [
      { href: '/admin/ai-models', label: 'AI models (OpenRouter)' },
      { href: '/admin/run-logs', label: 'Run logs' },
      { href: '/admin/usage', label: 'Usage & cost' },
      { href: '/admin/ai-runs', label: 'AI analysis runs' },
    ],
  },
];

export function AdminNavLinks() {
  return (
    <>
      {SECTIONS.map((section) => (
        <React.Fragment key={section.label}>
          <span className="admin-nav-section-header" data-section={section.label}>
            {section.label}
          </span>
          {section.links.map(({ href, label }) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}
