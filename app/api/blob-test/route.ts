/**
 * Minimal test route for Vercel Blob private upload.
 * POST with body = raw file bytes, ?filename=something.txt
 * Remove or protect this route before production.
 */
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') ?? `test-${Date.now()}.txt`;
    if (!request.body) return NextResponse.json({ ok: false, error: 'No body' }, { status: 400 });

    const blob = await put(filename, request.body, {
      access: 'private',
    });

    return NextResponse.json({ ok: true, url: blob.url, pathname: blob.pathname });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
