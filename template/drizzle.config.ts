/**
 * Drizzle Kit config. Base stack uses Neon (DATABASE_URL).
 * Run: npx drizzle-kit pull, npx drizzle-kit generate, npx drizzle-kit migrate
 */

import { defineConfig } from 'drizzle-kit';

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI || 'postgresql://localhost:5432/app';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: connectionString },
});
