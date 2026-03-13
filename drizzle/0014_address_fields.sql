ALTER TABLE "org_organisations" ADD COLUMN IF NOT EXISTS "address_line1" text;
ALTER TABLE "org_organisations" ADD COLUMN IF NOT EXISTS "address_line2" text;
ALTER TABLE "org_organisations" ADD COLUMN IF NOT EXISTS "address_postcode" text;
ALTER TABLE "org_organisations" ADD COLUMN IF NOT EXISTS "address_state_province" text;
ALTER TABLE "org_organisations" ADD COLUMN IF NOT EXISTS "address_country" text;
--> statement-breakpoint
ALTER TABLE "project_main" ADD COLUMN IF NOT EXISTS "address_line1" text;
ALTER TABLE "project_main" ADD COLUMN IF NOT EXISTS "address_line2" text;
ALTER TABLE "project_main" ADD COLUMN IF NOT EXISTS "address_postcode" text;
ALTER TABLE "project_main" ADD COLUMN IF NOT EXISTS "address_state_province" text;
ALTER TABLE "project_main" ADD COLUMN IF NOT EXISTS "address_country" text;
