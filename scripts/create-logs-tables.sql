-- Run this in Neon Dashboard → SQL Editor to create logs_ai_runs and logs_reports.
-- Fixes: relation "logs_reports" does not exist

CREATE TABLE IF NOT EXISTS "logs_ai_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "event_type" text NOT NULL,
  "project_id" uuid REFERENCES "public"."project_main"("id") ON DELETE SET NULL,
  "user_id" uuid REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL,
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
  "project_id" uuid NOT NULL REFERENCES "public"."project_main"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL,
  "report_id" uuid NOT NULL REFERENCES "public"."report_generated"("id") ON DELETE CASCADE,
  "analysis_id" uuid NOT NULL REFERENCES "public"."ai_analyses"("id") ON DELETE CASCADE,
  "report_type" text NOT NULL,
  "source" text,
  "file_ids" jsonb
);
