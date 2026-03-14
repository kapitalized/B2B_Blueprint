-- Add short_id to report_generated for short URLs. Run in Neon SQL Editor.
ALTER TABLE report_generated ADD COLUMN IF NOT EXISTS short_id text;
-- Optional: backfill existing rows with a placeholder so API can return something (new reports get real shortId on insert).
-- UPDATE report_generated SET short_id = left(id::text, 6) WHERE short_id IS NULL;
