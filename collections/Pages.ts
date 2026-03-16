import type { CollectionConfig } from 'payload';

/**
 * Marketing pages with SEO tab. Used by getPageMetadata when fetching from CMS.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'URL path, e.g. about' } },
    { name: 'metaTitle', type: 'text', admin: { description: 'SEO: overrides default title' } },
    { name: 'metaDescription', type: 'textarea', admin: { description: 'SEO: 150–160 chars' } },
    { name: 'metaKeywords', type: 'text', admin: { description: 'SEO: comma-separated keywords' } },
    { name: 'canonicalUrl', type: 'text', admin: { description: 'SEO: canonical URL' } },
    { name: 'indexPage', type: 'checkbox', defaultValue: true, admin: { description: 'Allow search engine indexing' } },
  ],
};
