/**
 * Get current session for API routes. Supports Neon Auth and Supabase fallback.
 * Returns userId (uuid string) and user for authorization checks.
 */

import { headers } from 'next/headers';
import { isNeonAuthConfigured } from '@/lib/auth/server';
import { getSessionForLayout } from '@/lib/auth/get-session-for-layout';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { user_profiles } from '@/lib/db/schema';

export interface SessionUser {
  id: string;
  email?: string | null;
}

export interface ApiSession {
  user: SessionUser;
  userId: string;
}

/** Get session in API routes. Returns null if unauthenticated. */
export async function getSessionForApi(): Promise<ApiSession | null> {
  if (isNeonAuthConfigured()) {
    try {
      const session = await getSessionForLayout(await headers());
      const user = session?.user;
      if (user?.id) {
        return { user: { id: user.id, email: user.email }, userId: user.id };
      }
    } catch {
      // fall through to Supabase
    }
  }
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) {
      return {
        user: { id: data.user.id, email: data.user.email ?? null },
        userId: data.user.id,
      };
    }
  }
  return null;
}

/** Ensure user_profiles row exists (for FK from project_main). Call after getSessionForApi when creating projects. */
export async function ensureUserProfile(session: ApiSession): Promise<void> {
  const email = session.user.email ?? `user-${session.userId}@placeholder.local`;
  await db
    .insert(user_profiles)
    .values({ id: session.userId, email })
    .onConflictDoNothing({ target: user_profiles.id });
}
