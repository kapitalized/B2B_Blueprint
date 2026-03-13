CREATE TABLE IF NOT EXISTS "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"full_address" text,
	"address_line1" text,
	"address_line2" text,
	"address_postcode" text,
	"address_state_province" text,
	"address_country" text,
	"type" text DEFAULT 'team' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan_status" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_digests" ADD COLUMN "building_level" integer;--> statement-breakpoint
ALTER TABLE "project_files" ADD COLUMN "building_level" integer;--> statement-breakpoint
ALTER TABLE "project_main" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "project_main" ADD COLUMN "address_line1" text;--> statement-breakpoint
ALTER TABLE "project_main" ADD COLUMN "address_line2" text;--> statement-breakpoint
ALTER TABLE "project_main" ADD COLUMN "address_postcode" text;--> statement-breakpoint
ALTER TABLE "project_main" ADD COLUMN "address_state_province" text;--> statement-breakpoint
ALTER TABLE "project_main" ADD COLUMN "address_country" text;--> statement-breakpoint
ALTER TABLE "project_main" ADD COLUMN "number_of_levels" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "report_generated" ADD COLUMN "building_level" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "default_org_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_org_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org_organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_main" ADD CONSTRAINT "project_main_org_id_org_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org_organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
