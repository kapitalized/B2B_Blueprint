/**
 * Neon Auth (Better Auth) client for browser. Base stack auth.
 * Use for signIn, signOut, and session in Client Components.
 */

import { createAuthClient } from 'better-auth/client';

// Client calls our app's auth API route (handler proxies to Neon Auth).
const baseUrl = typeof window !== 'undefined' ? window.location.origin + '/api/auth' : '';

export const authClient = createAuthClient({
  baseURL: baseUrl || undefined,
  fetchOptions: { credentials: 'include' as RequestCredentials },
});

export function isNeonAuthClientConfigured(): boolean {
  return typeof window !== 'undefined';
}
