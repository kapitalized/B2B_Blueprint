-- Add raw_extraction to ai_analyses so overlay uses this run's extraction (and report stamp has per-run data).
-- Run in Neon SQL Editor.

ALTER TABLE "ai_analyses"
ADD COLUMN IF NOT EXISTS "raw_extraction" jsonb;
