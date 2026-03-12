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

export const auth = baseUrl && cookieSecret
  ? createNeonAuth({
      baseUrl,
      cookies: { secret: cookieSecret },
      // Match cookie prefix used by Neon Auth so getSession() finds the session
      advanced: { cookiePrefix: 'neon-auth' } as Record<string, unknown>,
    })
  : null;

export function isNeonAuthConfigured(): boolean {
  return !!baseUrl && !!cookieSecret;
}
