import type { CollectionConfig } from 'payload';

/**
 * Run history for external API syncs. One record per run (manual or cron).
 */
export const ExternalApiRuns: CollectionConfig = {
  slug: 'external-api-runs',
  admin: {
    useAsTitle: 'id',
    group: 'Admin',
    description: 'History of external API sync runs.',
    defaultColumns: ['source', 'status', 'startedAt', 'finishedAt'],
  },
  access: {
    read: ({ req: { user } }) => Boolean(user?.role === 'admin'),
    create: () => true, // created by API/cron
    update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
    delete: ({ req: { user } }) => Boolean(user?.role === 'admin'),
  },
  fields: [
    {
      name: 'source',
      type: 'relationship',
      relationTo: 'api-sources',
      required: true,
      admin: { description: 'API source that was run.' },
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'finishedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
        { label: 'Running', value: 'running' },
      ],
    },
    {
      name: 'recordsFetched',
      type: 'number',
      admin: { description: 'Number of records returned (if applicable).' },
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      admin: { description: 'Error message if status is error.' },
    },
    {
      name: 'rawResult',
      type: 'json',
      admin: { description: 'Optional summary or sample of fetched data (for debugging).' },
    },
  ],
};
