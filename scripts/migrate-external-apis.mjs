/**
 * Standalone migration: add api_sources, external_api_runs, and payload_locked_documents_rels columns.
 * Run when Payload CLI fails (e.g. ERR_MODULE_NOT_FOUND). Uses DATABASE_URL from .env.local.
 *
 * Usage: node scripts/migrate-external-apis.mjs
 * Or:    npm run migrate:external-apis
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found. Create it with DATABASE_URL=...');
  process.exit(1);
}
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
});

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI;
if (!connectionString) {
  console.error('DATABASE_URL or DATABASE_URI not set in .env.local');
  process.exit(1);
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(connectionString);

async function run(query) {
  try {
    await sql(query);
  } catch (e) {
    if (e.code === '42P07') return; // already exists
    if (e.code === '42701') return; // duplicate column
    throw e;
  }
}

console.log('Running external APIs migration...');

await run(`CREATE TABLE IF NOT EXISTS "api_sources" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "adapter" varchar NOT NULL DEFAULT 'generic',
  "config" jsonb NOT NULL,
  "enabled" boolean DEFAULT true,
  "cron_job_id" varchar,
  "last_run_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
)`);

await run(`CREATE TABLE IF NOT EXISTS "external_api_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "started_at" timestamp(3) with time zone NOT NULL,
  "finished_at" timestamp(3) with time zone,
  "status" varchar NOT NULL,
  "records_fetched" integer,
  "error_message" text,
  "raw_result" jsonb,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "api_sources_id" integer
)`);

await run(`DO $$ BEGIN
  ALTER TABLE "external_api_runs" ADD CONSTRAINT "external_api_runs_api_sources_fk" FOREIGN KEY ("api_sources_id") REFERENCES "public"."api_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$`);

await run(`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "api_sources_id" integer`);
await run(`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "external_api_runs_id" integer`);

await run(`DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_api_sources_fk" FOREIGN KEY ("api_sources_id") REFERENCES "public"."api_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$`);
await run(`DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_external_api_runs_fk" FOREIGN KEY ("external_api_runs_id") REFERENCES "public"."external_api_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$`);

await run(`CREATE INDEX IF NOT EXISTS "api_sources_updated_at_idx" ON "api_sources" USING btree ("updated_at")`);
await run(`CREATE INDEX IF NOT EXISTS "api_sources_created_at_idx" ON "api_sources" USING btree ("created_at")`);
await run(`CREATE INDEX IF NOT EXISTS "external_api_runs_updated_at_idx" ON "external_api_runs" USING btree ("updated_at")`);
await run(`CREATE INDEX IF NOT EXISTS "external_api_runs_created_at_idx" ON "external_api_runs" USING btree ("created_at")`);
await run(`CREATE INDEX IF NOT EXISTS "external_api_runs_api_sources_id_idx" ON "external_api_runs" USING btree ("api_sources_id")`);
await run(`CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_api_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("api_sources_id")`);
await run(`CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_external_api_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("external_api_runs_id")`);

console.log('Done. Restart dev server and open /admin.');
process.exit(0);
