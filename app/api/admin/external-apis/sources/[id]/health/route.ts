/**
 * Admin: quick health check for one API source (does not persist a run).
 * GET /api/admin/external-apis/sources/[id]/health
 */
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { getAdapter } from '@/lib/external-apis';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionForApi();
  if (!session && !(await isPayloadAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing source id' }, { status: 400 });

  try {
    const resolvedConfig = typeof config.then === 'function' ? await config : config;
    const payload = await getPayload({ config: resolvedConfig });
    const source = await payload.findByID({
      collection: 'api-sources',
      id,
    });
    if (!source) {
      return NextResponse.json({ ok: false, message: 'Source not found' });
    }

    const adapterKey = (source as { adapter?: string }).adapter ?? 'generic';
    const adapter = getAdapter(adapterKey);
    if (!adapter) {
      return NextResponse.json({ ok: false, message: `Unknown adapter: ${adapterKey}` });
    }

    const configJson = (source as { config?: unknown }).config;
    const result = await adapter.run(configJson);
    const ok = result.status === 'success';
    return NextResponse.json({
      ok,
      status: result.status,
      message: ok ? 'OK' : (result.errorMessage ?? 'Check failed'),
      recordsFetched: result.recordsFetched,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
