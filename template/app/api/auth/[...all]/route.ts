/**
 * Neon Auth (Better Auth) handler. Base stack.
 * All auth routes (sign-in, sign-out, session, etc.) go through this.
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

export async function GET(req: Request) {
  if (!handler) return notConfigured();
  return handler.GET(req);
}

export async function POST(req: Request) {
  if (!handler) return notConfigured();
  return handler.POST(req);
}
