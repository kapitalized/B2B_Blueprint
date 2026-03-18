import type { CollectionConfig } from 'payload';

/**
 * External API sources — one record per configured API (modular: add adapters in lib/external-apis).
 * Use with cron-job.org: create a job that calls POST /api/cron/sync-external with CRON_SECRET and ?sourceId=<id>.
 */
export const ApiSources: CollectionConfig = {
  slug: 'api-sources',
  admin: {
    useAsTitle: 'name',
    group: 'Admin',
    description: 'External API sources. Configure each source; run manually or via cron-job.org.',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user?.role === 'admin'),
    create: ({ req: { user } }) => Boolean(user?.role === 'admin'),
    update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
    delete: ({ req: { user } }) => Boolean(user?.role === 'admin'),
  },
  fields: [
    { name: 'name', type: 'text', required: true, admin: { placeholder: 'e.g. CRM API' } },
    {
      name: 'adapter',
      type: 'text',
      required: true,
      defaultValue: 'generic',
      admin: {
        description: 'Adapter key (e.g. generic). Add new adapters in lib/external-apis/adapters.',
      },
    },
    {
      name: 'config',
      type: 'json',
      required: true,
      admin: {
        description: 'Adapter-specific config (e.g. { "url": "https://...", "method": "GET", "headers": {} }).',
      },
    },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
    {
      name: 'cronJobId',
      type: 'text',
      admin: {
        description: 'Optional: cron-job.org job ID for reference (console.cron-job.org).',
      },
    },
    {
      name: 'lastRunAt',
      type: 'date',
      admin: { readOnly: true, description: 'Set automatically after each run.' },
    },
  ],
};
