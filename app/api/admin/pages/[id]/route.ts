/**
 * Admin: update a single CMS page (for inline SEO table edit). Allowed: dashboard session OR Payload admin.
 */
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

const ALLOWED_KEYS = ['title', 'slug', 'metaTitle', 'metaDescription', 'metaKeywords'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      const v = body[key];
      data[key] = typeof v === 'string' ? v : String(v ?? '');
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 });
  }

  try {
    const resolvedConfig = typeof config.then === 'function' ? await config : config;
    const payload = await getPayload({ config: resolvedConfig });
    const updated = await payload.update({
      collection: 'pages',
      id,
      data,
    });
    return NextResponse.json({
      id: String(updated.id),
      title: updated.title ?? '',
      slug: updated.slug ?? '',
      metaTitle: updated.metaTitle ?? '',
      metaDescription: updated.metaDescription ?? '',
      metaKeywords: (updated as { metaKeywords?: string }).metaKeywords ?? '',
    });
  } catch (e) {
    console.error('[admin/pages PATCH]', e);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}
