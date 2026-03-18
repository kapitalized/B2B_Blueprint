/**
 * Admin: list external API sources. Allowed: dashboard session OR Payload admin.
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
  try {
    const resolvedConfig = typeof config.then === 'function' ? await config : config;
    const payload = await getPayload({ config: resolvedConfig });
    const result = await payload.find({
      collection: 'api-sources',
      limit: 100,
      sort: '-updatedAt',
    });
    const sources = result.docs.map((doc) => {
      const d = doc as unknown as Record<string, unknown>;
      return {
        id: String(doc.id),
        name: (d.name as string) ?? '',
        adapter: (d.adapter as string) ?? 'generic',
        enabled: Boolean(d.enabled),
        cronJobId: (d.cronJobId as string) ?? null,
        lastRunAt: d.lastRunAt != null ? String(d.lastRunAt) : null,
        updatedAt: d.updatedAt != null ? String(d.updatedAt) : null,
      };
    });
    return NextResponse.json({ sources });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
