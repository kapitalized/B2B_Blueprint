/**
 * SEO module: page metadata with fallback to BRAND.
 * Uses Payload Pages + Site Settings when available, else static PAGES.
 */

import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { getPageBySlug, getSiteSettings } from '@/lib/payload-content';

export interface PageMeta {
  title?: string;
  description?: string;
  canonical?: string;
  openGraph?: { title?: string; description?: string; images?: string[] };
  robots?: 'index, follow' | 'noindex, nofollow';
}

/** Static page config; used when Payload has no page for the slug. */
export const PAGES: Record<string, PageMeta> = {
  about: {
    title: 'About',
    description: `Learn about ${BRAND.name} — ${BRAND.slogan}.`,
    robots: 'index, follow',
  },
  features: {
    title: 'Features',
    description: `Explore ${BRAND.name} features: AI extraction, verification workflows, and B2B reporting.`,
    robots: 'index, follow',
  },
  pricing: {
    title: 'Pricing',
    description: `Plans and pricing for ${BRAND.name}. Starter and Pro tiers for teams.`,
    robots: 'index, follow',
  },
  contact: {
    title: 'Contact',
    description: `Contact ${BRAND.name} for sales and support.`,
    robots: 'index, follow',
  },
  privacy: {
    title: 'Privacy Policy',
    description: `Privacy policy for ${BRAND.name} — how we collect, use, and protect your data.`,
    robots: 'index, follow',
  },
  terms: {
    title: 'Terms of Service',
    description: `Terms of service for using ${BRAND.name} — acceptable use and legal terms.`,
    robots: 'index, follow',
  },
};

const DEFAULT_DESCRIPTION = BRAND.slogan;

/**
 * Returns Next.js Metadata for a marketing page by slug.
 * Tries Payload (Pages + Site Settings) first, then static PAGES and BRAND.
 */
export async function getPageMetadata(slug: string): Promise<Metadata> {
  const [cmsPage, siteSettings] = await Promise.all([
    getPageBySlug(slug),
    getSiteSettings(),
  ]);

  const siteTitle = siteSettings?.siteTitle ?? BRAND.name;
  const titleTemplate = siteSettings?.titleTemplate ?? `%s | ${BRAND.name}`;
  const defaultDesc = siteSettings?.defaultDescription ?? DEFAULT_DESCRIPTION;
  const defaultOG = siteSettings?.defaultOGImage ?? BRAND.logo;

  const title =
    cmsPage?.metaTitle ?? cmsPage?.title ?? PAGES[slug]?.title ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const description = cmsPage?.metaDescription ?? PAGES[slug]?.description ?? defaultDesc;
  const fullTitle = title.includes(siteTitle) ? title : titleTemplate.replace('%s', title);
  const robots = cmsPage?.indexPage === false ? 'noindex, nofollow' : (PAGES[slug]?.robots ?? 'index, follow');

  return {
    title: fullTitle,
    description,
    metadataBase: process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL)
      : undefined,
    openGraph: {
      title: fullTitle,
      description,
      images: defaultOG ? [defaultOG] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
    alternates: cmsPage?.canonicalUrl ? { canonical: cmsPage.canonicalUrl } : undefined,
    robots,
  };
}

/** B2B Software JSON-LD for structured data (blueprint §5). */
export function getB2BSoftwareJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: BRAND.name,
    description: BRAND.slogan,
    applicationCategory: 'BusinessApplication',
  };
}
