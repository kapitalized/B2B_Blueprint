# Fix: relation "logs_reports" does not exist

The app writes to `logs_reports` and `logs_ai_runs` when you run analysis. Those tables are created by the Drizzle migration **0010** (`drizzle/0010_logs_tables.sql`). If you see "relation logs_reports does not exist", the migration hasn’t been applied to your database.

---

## Option 1: Run Drizzle migrations (recommended)

From the project root, with **DATABASE_URL** pointing at your Neon DB (e.g. from `.env.local`):

**PowerShell:**
```powershell
cd "c:\Users\Microsoft\Documents\Github-Kapitalized\B2B_Blueprint"
$env:DATABASE_URL = "postgresql://..."   # paste your Neon connection string from .env.local
npx drizzle-kit migrate
```

**Bash:**
```bash
cd /path/to/B2B_Blueprint
export DATABASE_URL="postgresql://..."   # from .env.local
npx drizzle-kit migrate
```

This applies all pending migrations, including 0010.

---

## Option 2: Create only the log tables in Neon SQL Editor

If you prefer not to run the full migration (e.g. other parts of 0010 are already applied), in **Neon Dashboard → SQL Editor** run:

```sql
CREATE TABLE IF NOT EXISTS "logs_ai_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "event_type" text NOT NULL,
  "project_id" uuid REFERENCES "public"."project_main"("id"),
  "user_id" uuid REFERENCES "public"."user_profiles"("id"),
  "provider" text NOT NULL,
  "model" text,
  "input_tokens" integer,
  "output_tokens" integer,
  "total_tokens" integer,
  "cost" numeric,
  "latency_ms" integer,
  "metadata" jsonb
);

CREATE TABLE IF NOT EXISTS "logs_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "public"."project_main"("id"),
  "user_id" uuid REFERENCES "public"."user_profiles"("id"),
  "report_id" uuid NOT NULL REFERENCES "public"."report_generated"("id"),
  "analysis_id" uuid NOT NULL REFERENCES "public"."ai_analyses"("id"),
  "report_type" text NOT NULL,
  "source" text,
  "file_ids" jsonb
);
```

Then run analysis again; the error should be gone.
