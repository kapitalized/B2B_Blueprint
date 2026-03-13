'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useActionState } from 'react';
import { authClient, isNeonAuthClientConfigured } from '@/lib/auth/client';
import { createClient } from '@/lib/supabase/client';
import { signInWithEmailNeon } from './actions';
// supabase not used
const supabaseConfigured = () =>
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const reason = searchParams.get('reason');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [state, formAction, isPending] = useActionState(signInWithEmailNeon, null);
  const useNeon = mounted && isNeonAuthClientConfigured();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (reason === 'session') setError('Your session expired or you need to sign in.');
  }, [reason]);
  useEffect(() => {
    if (state?.error) setError(state.error);
  }, [state]);

  async function handleSubmitSupabase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!supabaseConfigured()) {
      setError('No auth configured.');
      return;
    }
    const form = e.currentTarget;
    const email = form.querySelector<HTMLInputElement>('[name=email]')?.value ?? '';
    const password = form.querySelector<HTMLInputElement>('[name=password]')?.value ?? '';
    setSupabaseLoading(true);
    try {
      const client = createClient();
      if (!client) {
        setError('Supabase client not available.');
        return;
      }
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSupabaseLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (supabaseConfigured() && !useNeon) {
      e.preventDefault();
      handleSubmitSupabase(e);
    }
  }

  const loading = useNeon ? isPending : supabaseLoading;

  if (mounted && !isNeonAuthClientConfigured() && !supabaseConfigured()) {
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
        Log in to your account.
      </p>
      {mounted && typeof window !== 'undefined' && (
        <p className="mt-2 text-xs text-muted-foreground">
          Use the same browser URL for the whole session (e.g. {window.location.origin}).
        </p>
      )}
      <form
        action={useNeon ? formAction : undefined}
        onSubmit={handleSubmit}
        className="mt-4 space-y-3"
      >
        {useNeon && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
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
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            disabled={loading}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border bg-card p-6 shadow-sm animate-pulse h-48" />}>
      <LoginForm />
    </Suspense>
  );
}
