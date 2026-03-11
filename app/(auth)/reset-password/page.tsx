'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { authClient, isNeonAuthClientConfigured } from '@/lib/auth/client';
import { createClient } from '@/lib/supabase/client';

const supabaseConfigured = () =>
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? searchParams.get('token_hash') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Invalid or missing reset link. Request a new one from the forgot password page.');
      return;
    }

    if (isNeonAuthClientConfigured() && authClient) {
      setLoading(true);
      try {
        const { error: resetError } = await (authClient as { resetPassword?: (opts: { newPassword: string; token: string }) => Promise<{ error?: { message?: string } }> }).resetPassword?.({
          newPassword: password,
          token,
        });
        if (resetError) {
          setError(resetError.message ?? 'Reset failed. Link may have expired.');
          return;
        }
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Reset failed.');
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
        const { error: resetError } = await client.auth.updateUser({ password });
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Reset failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setError('No auth configured.');
  }

  if (!mounted) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!token && mounted) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Invalid link</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This reset link is missing or invalid. Request a new one from the forgot password page.
        </p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Forgot password
        </Link>
        <span className="mx-2 text-muted-foreground">|</span>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Password updated</h2>
        <p className="mt-2 text-sm text-muted-foreground">Redirecting you to log in…</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Log in now
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Set new password</h2>
      <p className="mt-1 text-sm text-muted-foreground">Enter your new password below.</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="At least 8 characters"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Repeat password"
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
          {loading ? 'Updating…' : 'Update password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border bg-card p-6 shadow-sm animate-pulse h-48" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
