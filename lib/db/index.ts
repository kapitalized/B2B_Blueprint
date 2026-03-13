/**
 * Drizzle + Neon (serverless HTTP). Base stack DB client.
 * Uses DATABASE_URL. Schema in ./schema.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI;
if (!connectionString) {
  console.warn('[db] DATABASE_URL (or DATABASE_URI) not set; Drizzle client will throw on use.');
}

const connection = neon(connectionString!);
export const db = drizzle(connection, { schema });
/** Raw Neon SQL for vector/embedding and other non-Drizzle operations. */
export const sql = connection;
export * from './schema';
