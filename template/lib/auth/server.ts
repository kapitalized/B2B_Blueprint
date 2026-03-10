/**
 * Neon Auth (Better Auth) server instance. Base stack auth.
 * Use getSession(), handler(), and middleware() from this instance.
 */

import { createNeonAuth } from '@neondatabase/auth/next/server';

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

export const auth = baseUrl && cookieSecret
  ? createNeonAuth({
      baseUrl,
      cookies: { secret: cookieSecret },
    })
  : null;

export function isNeonAuthConfigured(): boolean {
  return !!baseUrl && !!cookieSecret;
}
