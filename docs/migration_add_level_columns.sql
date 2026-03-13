-- Add level-related columns (number_of_levels, building_level).
-- Run against your Neon/Postgres DB. Skip any statement that errors with "already exists".

-- Project: number of building levels (1, 2, 3, ...)
ALTER TABLE "project_main" ADD COLUMN IF NOT EXISTS "number_of_levels" integer DEFAULT 1;

-- Files: which level a floorplan belongs to
ALTER TABLE "project_files" ADD COLUMN IF NOT EXISTS "building_level" integer;

-- AI digest/report: tag analysis by level
ALTER TABLE "ai_digests" ADD COLUMN IF NOT EXISTS "building_level" integer;
ALTER TABLE "report_generated" ADD COLUMN IF NOT EXISTS "building_level" integer;
