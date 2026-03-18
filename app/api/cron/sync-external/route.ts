/**
 * Cron webhook for external API sync. Call from cron-job.org (https://console.cron-job.org/jobs).
 * Set CRON_SECRET in env; send it in header: Authorization: Bearer <CRON_SECRET> or X-Cron-Secret: <CRON_SECRET>.
 * Query: ?sourceId=<id> to run one source; omit to run all enabled sources.
 */
import { NextResponse } from 'next/server';
import { runApiSource, runAllEnabledSources } from '@/lib/external-apis';

function getCronSecret(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return request.headers.get('x-cron-secret');
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Cron not configured (CRON_SECRET)' }, { status: 501 });
  }
  const provided = getCronSecret(request);
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get('sourceId');
  try {
    if (sourceId) {
      const result = await runApiSource(sourceId);
      return NextResponse.json({ ok: true, sourceId, result });
    }
    const results = await runAllEnabledSources();
    return NextResponse.json({ ok: true, ran: results.length, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
