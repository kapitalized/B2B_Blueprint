/**
 * Admin: list recent external API runs. GET ?limit=50
 */
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';

export async function GET(request: Request) {
  const session = await getSessionForApi();
  if (!session && !(await isPayloadAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  try {
    const resolvedConfig = typeof config.then === 'function' ? await config : config;
    const payload = await getPayload({ config: resolvedConfig });
    const result = await payload.find({
      collection: 'external-api-runs',
      limit,
      sort: '-startedAt',
      depth: 1,
    });
    const runs = result.docs.map((doc) => {
      const d = doc as unknown as Record<string, unknown>;
      const source = d.source as { id?: string; name?: string } | null;
      return {
        id: String(doc.id),
        sourceId: source?.id != null ? String(source.id) : (d.source as string) ?? null,
        sourceName: source?.name ?? null,
        startedAt: d.startedAt != null ? String(d.startedAt) : null,
        finishedAt: d.finishedAt != null ? String(d.finishedAt) : null,
        status: (d.status as string) ?? null,
        recordsFetched: typeof d.recordsFetched === 'number' ? d.recordsFetched : null,
        errorMessage: (d.errorMessage as string) ?? null,
      };
    });
    return NextResponse.json({ runs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
