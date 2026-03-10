/**
 * Protects /dashboard: uses Neon Auth (base) when configured, else Supabase.
 * Redirects to /login when unauthenticated.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { isNeonAuthConfigured } from '@/lib/auth/server';
import { updateSession } from '@/lib/supabase/middleware';

const dashboardPrefix = '/dashboard';

function isDashboard(pathname: string) {
  return pathname === dashboardPrefix || pathname.startsWith(dashboardPrefix + '/');
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isNeonAuthConfigured()) {
    const sessionCookie = getSessionCookie(request);
    if (isDashboard(pathname) && !sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  const { response, user } = await updateSession(request);
  if (isDashboard(pathname) && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|admin|api).*)',
  ],
};
