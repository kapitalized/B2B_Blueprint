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

/** Decode once so double-encoded cookie values from browser work with session validation. */
function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Build Cookie header with neon-auth session token also set as better-auth token so getSession finds it. */
function buildCookieHeaderWithMappedSession(cookieHeader: string | null): string {
  if (!cookieHeader) return '';
  const secure = getSecurePrefix();
  const neonNameSecure = `${secure}${NEON_PREFIX}.${SESSION_TOKEN_NAME}`;
  const neonNamePlain = `${NEON_PREFIX}.${SESSION_TOKEN_NAME}`;
  let neonValue = parseCookieValue(cookieHeader, neonNameSecure) ?? parseCookieValue(cookieHeader, neonNamePlain);
  if (!neonValue) return cookieHeader;
  neonValue = decodeCookieValue(neonValue);
  const defaultName = `${secure}${DEFAULT_PREFIX}.${SESSION_TOKEN_NAME}`;
  // Put the cookie auth library expects first so it is found
  return `${defaultName}=${neonValue}; ${cookieHeader}`;
}

/**
 * Get session for layout when Neon Auth is configured.
 * Prefer auth.getSession() (uses next/headers; middleware injects __Secure- cookies on http).
 * Fallback: map neon-auth cookie to better-auth name and call api.getSession({ headers }).
 */
export async function getSessionForLayout(headers: Headers): Promise<{ user?: { id?: string; email?: string } } | null> {
  if (!isNeonAuthConfigured() || !auth) return null;
  try {
    const neonAuth = auth as { getSession?: () => Promise<{ data?: { user?: { id?: string; email?: string } } }>; api?: { getSession: (opts: { headers: Headers }) => Promise<{ user?: { id?: string; email?: string } }> } };
    const { data } = (await neonAuth.getSession?.()) ?? {};
    if (data?.user) return data as { user?: { id?: string; email?: string } };
    const cookieHeader = headers.get('cookie');
    const mappedCookie = buildCookieHeaderWithMappedSession(cookieHeader);
    if (!mappedCookie || mappedCookie === cookieHeader) return null;
    const newHeaders = new Headers(headers);
    newHeaders.set('cookie', mappedCookie);
    const session = await neonAuth.api?.getSession?.({ headers: newHeaders });
    return session ?? null;
  } catch {
    return null;
  }
}
