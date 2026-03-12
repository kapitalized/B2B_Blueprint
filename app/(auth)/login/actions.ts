'use server';

/**
 * Server-action sign-in for Neon Auth. Calls our auth API and sets the session
 * cookie via cookies().set() so we control attributes (e.g. secure: false on http).
 * This avoids the browser rejecting Secure cookies on http://localhost.
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

const AUTH_PATH = '/api/auth/sign-in/email';

function parseSetCookie(setCookieStr: string): { name: string; value: string } | null {
  const eq = setCookieStr.indexOf('=');
  if (eq === -1) return null;
  const name = setCookieStr.slice(0, eq).trim();
  const rest = setCookieStr.slice(eq + 1);
  const semi = rest.indexOf(';');
  let value = (semi === -1 ? rest : rest.slice(0, semi)).trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* keep as-is */
  }
  return { name, value };
}

export async function signInWithEmailNeon(prev: { error?: string } | null, formData: FormData): Promise<{ error?: string } | null> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const next = ((formData.get('next') as string) || '/dashboard').trim();
  const nextPath = next.startsWith('/') ? next : `/${next}`;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const baseUrl = process.env.NODE_ENV === 'development'
    ? `http://${(await headers()).get('host') ?? 'localhost:3000'}`
    : `https://${(await headers()).get('host') ?? ''}`;
  const url = `${baseUrl}${AUTH_PATH}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, callbackURL: nextPath }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: { message?: string } })?.error?.message ?? 'Invalid email or password.';
    return { error: msg };
  }

  const setCookies = (res.headers as Headers & { getSetCookie?(): string[] }).getSetCookie?.();
  if (!setCookies?.length) {
    return { error: 'Session could not be set. Try again or use the same URL for the whole session.' };
  }

  const cookieStore = await cookies();
  const isSecure = process.env.NODE_ENV === 'production';

  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed) continue;
    const cookieName = parsed.name.startsWith('__Secure-') ? parsed.name.slice(9) : parsed.name;
    cookieStore.set(cookieName, parsed.value, {
      httpOnly: true,
      path: '/',
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  redirect(nextPath);
}
