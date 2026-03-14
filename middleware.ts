/**
 * Protects /dashboard: uses Neon Auth (base) when configured, else Supabase.
 * Neon path: optimistic cookie check only (no DB call in Edge) to avoid Edge/Node sync issues.
 */

import { type NextRequest, NextResponse } from 'next/server';

const dashboardPrefix = '/dashboard';

function isDashboard(pathname: string) {
  return pathname === dashboardPrefix || pathname.startsWith(dashboardPrefix + '/');
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // So root layout can avoid wrapping /admin with <html><body> (Payload provides its own)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  try {
    // Payload admin: no auth, just pass pathname so root layout can skip html/body
    if (pathname.startsWith('/admin')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
    const neonConfigured = !!(baseUrl && cookieSecret);

    if (neonConfigured) {
      // Lightweight check: presence of session cookie only (no DB). Avoid importing better-auth in Edge (uses Node APIs).
      const cookieHeader = request.headers.get('cookie') ?? '';
      const hasSessionCookie = /(?:^|;)\s*(?:__Secure-)?neon-auth\.session_token\s*=/i.test(cookieHeader);
      if (isDashboard(pathname) && !hasSessionCookie) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
      // Neon SDK only reads cookies starting with __Secure-neon-auth. On http we set neon-auth.* (no Secure).
      // Duplicate neon-auth.* as __Secure-neon-auth.* in the request so the SDK sees them.
      if (cookieHeader) {
        const pairs: string[] = [];
        for (const name of ['neon-auth.session_token', 'neon-auth.local.session_data']) {
          const secureName = `__Secure-${name}`;
          const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${name.replace(/\./g, '\\.')}=([^;]*)`));
          if (match) pairs.push(`${secureName}=${match[1].trim()}`);
        }
        if (pairs.length) requestHeaders.set('cookie', pairs.join('; ') + '; ' + cookieHeader);
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const { updateSession } = await import('@/lib/supabase/middleware');
    const { response, user } = await updateSession(request);
    if (isDashboard(pathname) && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[middleware]', err);
    }
    return NextResponse.next({ request });
  }
}

export const config = {
  // Run for dashboard, login, and API routes so cookie duplication (neon-auth → __Secure-neon-auth) applies to /api/projects too
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
