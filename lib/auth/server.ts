/**
 * Neon Auth (Better Auth) server instance. Base stack auth.
 * Use getSession(), handler(), and middleware() from this instance.
 *
 * Session cookies are scoped by origin (protocol + host + port). Different URLs
 * = different sessions: localhost:3000 ≠ localhost:3001 ≠ your-app.vercel.app.
 * Use one origin per environment and re-login when switching (see docs/NEON_SETUP.md).
 */

import { createNeonAuth } from '@neondatabase/auth/next/server';

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
// Required for cookies to be set for our app: without this, the proxy forwards
// upstream Set-Cookie (Neon's domain) and the browser won't send it to our host.
const cookieDomain =
  process.env.COOKIE_DOMAIN ??
  (process.env.NODE_ENV === 'development' ? 'localhost' : undefined);

export const auth = baseUrl && cookieSecret
  ? createNeonAuth({
      baseUrl,
      cookies: { secret: cookieSecret, domain: cookieDomain },
    })
  : null;

export function isNeonAuthConfigured(): boolean {
  return !!baseUrl && !!cookieSecret;
}
