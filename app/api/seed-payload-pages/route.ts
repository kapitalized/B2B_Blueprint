/**
 * One-time seed: create default Payload pages (about, features, pricing, contact, privacy, terms).
 * POST only. Requires ?key=INTERNAL_SERVICE_KEY (or same value in header x-seed-key).
 *
 * With dev server running: curl -X POST "http://localhost:3000/api/seed-payload-pages?key=YOUR_INTERNAL_SERVICE_KEY"
 * Or run: npm run seed:payload (opens dev server and triggers this).
 */

import { NextResponse } from 'next/server';
import { seedPayloadPages } from '@/lib/seed-payload-pages';

const SECRET = process.env.INTERNAL_SERVICE_KEY || 'dev-secret-handshake';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') ?? request.headers.get('x-seed-key');
  if (key !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await seedPayloadPages();
    return NextResponse.json({
      ok: true,
      created: result.created,
      skipped: result.skipped,
      message: 'Refresh the admin Pages list to see them.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
