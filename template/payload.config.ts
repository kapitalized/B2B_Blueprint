import path from 'node:path';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Pages } from './collections/Pages';
import { ExternalIntegrations } from './collections/ExternalIntegrations';
import { SiteSettings } from './globals/SiteSettings';

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URI;

export default buildConfig({
  admin: {
    user: Users.slug,
  },
  collections: [Users, Pages, ExternalIntegrations],
  globals: [SiteSettings],
  secret: process.env.PAYLOAD_SECRET || 'change-me-in-production',
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl || 'postgresql://localhost:5432/payload',
    },
  }),
  sharp,
});
