/**
 * Seed default marketing pages into Payload. Used by API route and (optionally) CLI.
 */

import { getPayload } from 'payload';
import config from '@payload-config';
import { BRAND } from '@/lib/brand';

export const DEFAULT_PAGES = [
  { slug: 'about', title: 'About', metaDescription: `Learn about ${BRAND.name} — ${BRAND.slogan}.` },
  {
    slug: 'features',
    title: 'Features',
    metaDescription: `Explore ${BRAND.name} features: floorplan analysis, materials estimation, and construction workflows.`,
  },
  {
    slug: 'pricing',
    title: 'Pricing',
    metaDescription: `Plans and pricing for ${BRAND.name}. Starter and Pro tiers for teams.`,
  },
  {
    slug: 'contact',
    title: 'Contact',
    metaDescription: `Contact ${BRAND.name} for sales and support.`,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    metaDescription: `Privacy policy for ${BRAND.name} — how we collect, use, and protect your data.`,
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    metaDescription: `Terms of service for using ${BRAND.name} — acceptable use and legal terms.`,
  },
];

export type SeedResult = { created: string[]; skipped: string[] };

export async function seedPayloadPages(): Promise<SeedResult> {
  const resolvedConfig = typeof config.then === 'function' ? await config : config;
  const payload = await getPayload({ config: resolvedConfig });
  const created: string[] = [];
  const skipped: string[] = [];

  for (const page of DEFAULT_PAGES) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      limit: 1,
    });
    if (existing.docs.length > 0) {
      skipped.push(page.slug);
      continue;
    }
    await payload.create({
      collection: 'pages',
      data: {
        title: page.title,
        slug: page.slug,
        metaDescription: page.metaDescription ?? undefined,
        indexPage: true,
      },
    });
    created.push(page.slug);
  }

  return { created, skipped };
}
