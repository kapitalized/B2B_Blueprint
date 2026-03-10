'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { authClient, isNeonAuthClientConfigured } from '@/lib/auth/client';
import { createClient } from '@/lib/supabase/client';

const supabaseConfigured = () =>
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (isNeonAuthClientConfigured() && authClient) {
      setLoading(true);
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: next,
      });
      setLoading(false);
      if (signInError) {
        setError(signInError.message ?? 'Sign in failed');
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    if (supabaseConfigured()) {
      setLoading(true);
      const client = createClient();
      if (!client) {
        setError('Supabase client not available.');
        setLoading(false);
        return;
      }
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    setError('No auth configured. Set Neon Auth (NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET) or Supabase env vars.');
  }

  if (!isNeonAuthClientConfigured() && !supabaseConfigured()) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Log in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Base stack: set <code className="rounded bg-muted px-1">NEON_AUTH_BASE_URL</code> and <code className="rounded bg-muted px-1">NEON_AUTH_COOKIE_SECRET</code> in .env.local (see /setup). Alternative: Supabase auth with <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_*</code>.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Continue to Dashboard (no auth) →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Log in</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isNeonAuthClientConfigured() ? 'Sign in with Neon Auth (base stack).' : 'Sign in with Supabase Auth.'}
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            disabled={loading}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {isNeonAuthClientConfigured() ? 'Create users via Neon Auth (Neon Console) or sign-up flow.' : 'Create users in Supabase Dashboard → Authentication → Users.'}
      </p>
    </div>
  );
}
