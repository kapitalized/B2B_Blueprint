/**
 * Admin: seed default Payload pages (about, features, pricing, contact, privacy, terms). Allowed: Payload admin or dashboard session.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { seedPayloadPages } from '@/lib/seed-payload-pages';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await seedPayloadPages();
    return NextResponse.json({
      ok: true,
      created: result.created,
      skipped: result.skipped,
      message: 'Refresh the list to see new pages.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
