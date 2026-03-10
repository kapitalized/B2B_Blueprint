'use server';

/**
 * Server actions for Supabase auth (sign out).
 * Sign in is done client-side so redirect works correctly.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect('/login');
}
