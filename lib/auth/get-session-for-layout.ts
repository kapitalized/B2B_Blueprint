/**
 * Get session for dashboard layout when using Neon Auth.
 * Neon Auth sets cookies with prefix "neon-auth", but auth.api.getSession() may look for "better-auth".
 * We copy the session cookie so getSession can find it.
 */

import { auth, isNeonAuthConfigured } from '@/lib/auth/server';

const NEON_PREFIX = 'neon-auth';
const DEFAULT_PREFIX = 'better-auth';
const SESSION_TOKEN_NAME = 'session_token';

function getSecurePrefix(): string {
  if (typeof process === 'undefined') return '';
  return process.env.NODE_ENV === 'production' ? '__Secure-' : '';
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((s) => s.trim());
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/** Build Cookie header with neon-auth session token also set as better-auth token so getSession finds it. */
function buildCookieHeaderWithMappedSession(cookieHeader: string | null): string {
  if (!cookieHeader) return '';
  const secure = getSecurePrefix();
  const neonNameSecure = `${secure}${NEON_PREFIX}.${SESSION_TOKEN_NAME}`;
  const neonNamePlain = `${NEON_PREFIX}.${SESSION_TOKEN_NAME}`;
  const neonValue = parseCookieValue(cookieHeader, neonNameSecure) ?? parseCookieValue(cookieHeader, neonNamePlain);
  if (!neonValue) return cookieHeader;
  const defaultName = `${secure}${DEFAULT_PREFIX}.${SESSION_TOKEN_NAME}`;
  // Put the cookie auth library expects first so it is found
  return `${defaultName}=${neonValue}; ${cookieHeader}`;
}

/**
 * Get session for layout when Neon Auth is configured.
 * Tries getSession first; if null, re-tries with headers that map neon-auth cookie to better-auth name.
 */
export async function getSessionForLayout(headers: Headers): Promise<{ user?: { id?: string; email?: string } } | null> {
  if (!isNeonAuthConfigured() || !auth) return null;
  try {
    let session = await (auth as { api?: { getSession: (opts: { headers: Headers }) => Promise<{ user?: { id?: string; email?: string } }> } }).api?.getSession?.({ headers });
    if (session?.user) return session;
    const cookieHeader = headers.get('cookie');
    const mappedCookie = buildCookieHeaderWithMappedSession(cookieHeader);
    if (!mappedCookie || mappedCookie === cookieHeader) return null;
    const newHeaders = new Headers(headers);
    newHeaders.set('cookie', mappedCookie);
    session = await (auth as { api?: { getSession: (opts: { headers: Headers }) => Promise<{ user?: { id?: string; email?: string } }> } }).api?.getSession?.({ headers: newHeaders });
    return session ?? null;
  } catch {
    return null;
  }
}
