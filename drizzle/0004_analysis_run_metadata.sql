ALTER TABLE "ai_analyses" ADD COLUMN IF NOT EXISTS "run_started_at" timestamp;
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD COLUMN IF NOT EXISTS "run_duration_ms" integer;
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD COLUMN IF NOT EXISTS "input_size_bytes" integer;
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD COLUMN IF NOT EXISTS "input_page_count" integer;
