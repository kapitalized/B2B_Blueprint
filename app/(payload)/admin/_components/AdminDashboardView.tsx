'use client';

import Link from 'next/link';

const LINKS = [
  { href: '/admin/pages-seo', label: 'Pages & SEO', description: 'All pages: name, URL, SEO title, description, keywords (click to edit)' },
  { href: '/admin/app-users', label: 'App users', description: 'Users who sign in to the app (Neon/Supabase)' },
  { href: '/admin/ai-models', label: 'AI models (OpenRouter)', description: 'Pipeline and chat model config' },
  { href: '/admin/run-logs', label: 'Run logs', description: 'AI pipeline runs and token usage' },
  { href: '/admin/usage', label: 'Usage & cost', description: 'AI usage and cost by model, event type, and day' },
  { href: '/admin/projects', label: 'Projects', description: 'App projects list' },
  { href: '/admin/chats', label: 'Chats', description: 'Chat threads by project' },
  { href: '/admin/files', label: 'Files', description: 'Project file uploads' },
  { href: '/admin/stripe-plans', label: 'Stripe plans', description: 'Create, list, archive subscription plans' },
  { href: '/admin/billing', label: 'Subscriptions', description: 'Org billing and subscription status' },
  { href: '/admin/billings', label: 'Billings', description: 'Invoices that users have paid' },
  { href: '/admin/ai-runs', label: 'AI analysis runs', description: 'View pipeline run output (JSON)' },
  { href: '/admin/env', label: 'Environment', description: '.env.local / Vercel env (read-only, masked)' },
] as const;

export function AdminDashboardView() {
  return (
    <div>
      <h1 className="text-2xl font-bold">App monitoring</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the sidebar for <strong>Admin users</strong> (CMS), <strong>Pages</strong>, and <strong>Site settings</strong>. Links below open app data and AI settings.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {LINKS.map(({ href, label, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">{label}</span>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
