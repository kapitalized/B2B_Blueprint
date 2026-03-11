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

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

    if (isNeonAuthClientConfigured() && authClient) {
      setLoading(true);
      try {
        const { error: signUpError } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: next,
        });
        if (signUpError) {
          setError(signUpError.message ?? 'Sign up failed.');
          return;
        }
        router.push(next);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign up failed.');
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
        const { error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        router.push(next);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign up failed.');
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
        <h2 className="text-lg font-semibold">Create account</h2>
        <p className="mt-2 text-sm text-muted-foreground">Configure Neon Auth or Supabase to enable sign-up.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Create account</h2>
      <p className="mt-1 text-sm text-muted-foreground">Enter your details to register.</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Your name"
            disabled={loading}
          />
        </div>
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
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="At least 8 characters"
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border bg-card p-6 shadow-sm animate-pulse h-64" />}>
      <SignUpForm />
    </Suspense>
  );
}
