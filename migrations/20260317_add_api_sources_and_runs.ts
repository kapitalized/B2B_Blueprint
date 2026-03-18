import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Create api_sources table (Payload collection slug: api-sources)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "api_sources" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "adapter" varchar NOT NULL DEFAULT 'generic',
      "config" jsonb NOT NULL,
      "enabled" boolean DEFAULT true,
      "cron_job_id" varchar,
      "last_run_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);
  // Create external_api_runs table (Payload collection slug: external-api-runs)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "external_api_runs" (
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
    );
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "external_api_runs" ADD CONSTRAINT "external_api_runs_api_sources_fk" FOREIGN KEY ("api_sources_id") REFERENCES "public"."api_sources"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  // Add locked_documents rels columns for new collections (Payload expects these)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "api_sources_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "external_api_runs_id" integer;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_api_sources_fk" FOREIGN KEY ("api_sources_id") REFERENCES "public"."api_sources"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_external_api_runs_fk" FOREIGN KEY ("external_api_runs_id") REFERENCES "public"."external_api_runs"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "api_sources_updated_at_idx" ON "api_sources" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "api_sources_created_at_idx" ON "api_sources" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "external_api_runs_updated_at_idx" ON "external_api_runs" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "external_api_runs_created_at_idx" ON "external_api_runs" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "external_api_runs_api_sources_id_idx" ON "external_api_runs" USING btree ("api_sources_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_api_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("api_sources_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_external_api_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("external_api_runs_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "api_sources_id";`);
  await db.execute(sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "external_api_runs_id";`);
  await db.execute(sql`DROP TABLE IF EXISTS "external_api_runs" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "api_sources" CASCADE;`);
}
