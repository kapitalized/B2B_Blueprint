/**
 * Neon Auth (Better Auth) handler. Base stack.
 * All auth routes (sign-in, sign-out, session, etc.) go through this.
 * Next.js [...all] gives params.all; Neon Auth handler expects params.path.
 *
 * Cookie secret: NEON_AUTH_COOKIE_SECRET is only in your app (.env.local / Vercel).
 * You generate it (32+ chars); do NOT set it in the Neon Console.
 */

import { auth } from '@/lib/auth/server';
import { NextResponse } from 'next/server';

const handler = auth?.handler();

async function notConfigured() {
  return NextResponse.json(
    { error: 'Neon Auth not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.' },
    { status: 503 }
  );
}

function toPathParams(params: Promise<{ all?: string[] }>): Promise<{ path: string[] }> {
  return params.then((p) => ({ path: p.all ?? [] }));
}

/** When request is HTTP (e.g. localhost), rewrite Set-Cookie so browser stores/sends them (strip Secure and __Secure- name prefix). */
function rewriteCookiesForHttp(request: Request, response: Response): Response {
  try {
    const url = new URL(request.url);
    if (url.protocol !== 'http:') return response;
    const setCookies = response.headers.getSetCookie?.();
    if (!setCookies?.length) return response;

    const rewritten = setCookies.map((cookieStr) => {
      let s = cookieStr.replace(/\s*;\s*Secure\s*(;|$)/gi, '$1').trim();
      if (s.endsWith(';')) s = s.slice(0, -1);
      const eq = s.indexOf('=');
      if (eq !== -1) {
        const name = s.slice(0, eq).trim();
        if (name.startsWith('__Secure-')) {
          s = name.slice(9) + s.slice(eq); // drop __Secure- prefix so cookie works on http
        }
      }
      return s;
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.delete('set-cookie');
    rewritten.forEach((v) => newHeaders.append('Set-Cookie', v));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch {
    return response;
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ all?: string[] }> }
) {
  if (!handler) return notConfigured();
  try {
    const res = await handler.GET(req, { params: toPathParams(context.params) });
    return rewriteCookiesForHttp(req, res);
  } catch (err) {
    console.error('[auth GET]:', err);
    return NextResponse.json(
      { error: 'Auth failed', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ all?: string[] }> }
) {
  if (!handler) return notConfigured();
  try {
    const res = await handler.POST(req, { params: toPathParams(context.params) });
    // Optional: log failed sign-in/sign-up for debugging and security (no credentials)
    if (!res.ok && process.env.NODE_ENV !== 'test') {
      const path = (await context.params).all?.join('/') ?? '';
      if (path.includes('sign-in') || path.includes('sign-up')) {
        let code: string | undefined;
        try {
          const clone = res.clone();
          const body = await clone.json().catch(() => ({}));
          code = (body as { error?: { code?: string } })?.error?.code;
        } catch {
          /* ignore */
        }
        console.warn('[auth]', path, 'failed', res.status, code ? `code=${code}` : '');
      }
    }
    return rewriteCookiesForHttp(req, res);
  } catch (err) {
    console.error('[auth POST]:', err);
    return NextResponse.json(
      { error: 'Auth failed', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
