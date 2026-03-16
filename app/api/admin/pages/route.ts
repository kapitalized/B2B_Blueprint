/**
 * Admin: list all CMS pages for SEO table. Allowed: dashboard session OR Payload admin.
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

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const resolvedConfig = typeof config.then === 'function' ? await config : config;
    const payload = await getPayload({ config: resolvedConfig });
    const result = await payload.find({
      collection: 'pages',
      limit: 500,
      sort: 'slug',
    });
    const pages = result.docs.map((doc) => {
      const d = doc as Record<string, unknown>;
      return {
        id: String(doc.id),
        title: (d.title as string) ?? '',
        slug: (d.slug as string) ?? '',
        metaTitle: (d.metaTitle as string) ?? '',
        metaDescription: (d.metaDescription as string) ?? '',
        metaKeywords: (typeof d.metaKeywords === 'string' ? d.metaKeywords : '') || '',
      };
    });
    return NextResponse.json(pages);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load pages';
    console.error('[admin/pages]', e);
    const hint = /meta_keywords|column.*does not exist/i.test(String(message))
      ? ' Run: npx payload migrate (or ALTER TABLE pages ADD COLUMN IF NOT EXISTS meta_keywords text;)'
      : '';
    return NextResponse.json(
      { error: String(message) + hint },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
