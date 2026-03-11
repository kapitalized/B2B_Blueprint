/**
 * Server-only: fetch Pages and Site Settings from Payload for the marketing site.
 * Falls back to null if Payload is unavailable (e.g. no DB).
 */

import { getPayload } from 'payload';
import config from '@payload-config';
import type { Page, SiteSetting } from '@/payload-types';

let payloadPromise: ReturnType<typeof getPayload> | null = null;

async function getPayloadInstance() {
  if (!payloadPromise) {
    const resolved = typeof config.then === 'function' ? await config : config;
    payloadPromise = getPayload({ config: resolved });
  }
  return payloadPromise;
}

/** Fetch a single page by slug, or null if not found or Payload fails. */
export async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const payload = await getPayloadInstance();
    const result = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      limit: 1,
    });
    return result.docs[0] ?? null;
  } catch {
    return null;
  }
}

/** Fetch site settings global, or null if Payload fails. */
export async function getSiteSettings(): Promise<SiteSetting | null> {
  try {
    const payload = await getPayloadInstance();
    const settings = await payload.findGlobal({ slug: 'site-settings' });
    return settings as SiteSetting | null;
  } catch {
    return null;
  }
}
