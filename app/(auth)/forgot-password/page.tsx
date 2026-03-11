'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { authClient, isNeonAuthClientConfigured } from '@/lib/auth/client';
import { createClient } from '@/lib/supabase/client';

const supabaseConfigured = () =>
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (isNeonAuthClientConfigured() && authClient) {
      setLoading(true);
      try {
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/reset-password`
            : '/reset-password';
        const { error: resetError } = await (authClient as { requestPasswordReset?: (opts: { email: string; redirectTo?: string }) => Promise<{ error?: { message?: string } }> }).requestPasswordReset?.({
          email: email.trim(),
          redirectTo,
        });
        if (resetError) {
          setError(resetError.message ?? 'Request failed.');
          return;
        }
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (supabaseConfigured()) {
      setLoading(true);
      try {
        const client = createClient();
        if (!client) {
          setError('Supabase client not available.');
          return;
        }
        const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
        });
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setError('No auth configured.');
  }

  if (mounted && !isNeonAuthClientConfigured() && !supabaseConfigured()) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Forgot password</h2>
        <p className="mt-2 text-sm text-muted-foreground">Configure Neon Auth or Supabase to use password reset.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to Log in
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Forgot password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send a reset link.
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to Log in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border bg-card p-6 shadow-sm animate-pulse h-48" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
