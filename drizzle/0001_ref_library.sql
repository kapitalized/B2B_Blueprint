CREATE TABLE IF NOT EXISTS "ref_building_compositions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_category" text NOT NULL,
	"building_subtype" text,
	"structure_type" text,
	"concrete_intensity_m3_per_m2" numeric,
	"steel_intensity_kg_per_m2" numeric,
	"rebar_intensity_kg_per_m3_concrete" numeric,
	"brick_intensity_m3_per_m2" numeric,
	"timber_intensity_m3_per_m2" numeric,
	"glass_intensity_kg_per_m2" numeric,
	"region" text,
	"climate_zone" text,
	"seismic_zone" text,
	"confidence_interval_low" numeric,
	"confidence_interval_high" numeric,
	"sample_size" integer,
	"source_id" text,
	"source_name" text,
	"publication_year" integer,
	"confidence_level" numeric,
	"properties" jsonb,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"superseded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_flooring_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flooring_category" text NOT NULL,
	"flooring_type" text NOT NULL,
	"construction_method" text,
	"typical_thickness_mm" numeric,
	"density_kg_m3" numeric,
	"weight_kg_per_m2" numeric,
	"requires_screed" boolean DEFAULT false,
	"screed_thickness_mm" numeric,
	"screed_density_kg_m3" numeric,
	"properties" jsonb,
	"source_id" text,
	"confidence_level" numeric,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_knowledge_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"source_standard_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_material_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_material_id" uuid,
	"component_material_id" uuid,
	"proportion_by_mass" numeric,
	"proportion_by_volume" numeric,
	"mix_designation" text,
	"cement_kg_per_m3" numeric,
	"water_kg_per_m3" numeric,
	"fine_aggregate_kg_per_m3" numeric,
	"coarse_aggregate_kg_per_m3" numeric,
	"admixtures" jsonb,
	"water_cement_ratio" numeric,
	"expected_strength_mpa" numeric,
	"source_id" text,
	"confidence_level" numeric,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"name" text NOT NULL,
	"standard_grade" text,
	"density_kg_m3" numeric,
	"unit_cost_estimate" numeric,
	"properties" jsonb,
	"source_id" text,
	"source_name" text,
	"publication_year" integer,
	"confidence_level" numeric,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"superseded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_regional_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" text NOT NULL,
	"country" text,
	"climate_zone" text,
	"concrete_factor" numeric,
	"steel_factor" numeric,
	"timber_factor" numeric,
	"labor_cost_index" numeric,
	"material_cost_index" numeric,
	"typical_foundation_type" text,
	"typical_floor_to_floor_height_m" numeric,
	"source_id" text,
	"confidence_level" numeric,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_roof_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roof_form" text NOT NULL,
	"structure_material" text,
	"covering_material" text,
	"typical_span_m" numeric,
	"typical_pitch_degrees" numeric,
	"typical_weight_kg_per_m2" numeric,
	"structure_weight_kg_per_m2" numeric,
	"covering_weight_kg_per_m2" numeric,
	"timber_intensity_m3_per_m2" numeric,
	"steel_intensity_kg_per_m2" numeric,
	"concrete_intensity_m3_per_m2" numeric,
	"properties" jsonb,
	"source_id" text,
	"confidence_level" numeric,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"authority" text NOT NULL,
	"code_number" text,
	"code_name" text NOT NULL,
	"section" text NOT NULL,
	"clause" text,
	"requirement_type" text,
	"requirement_value_numeric" numeric,
	"requirement_unit" text,
	"requirement_text" text,
	"description" text,
	"jurisdiction" text,
	"application" text,
	"building_types" text,
	"evaluation_formula" text,
	"source_url" text,
	"pdf_reference" text,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"superseded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_unit_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_unit" text NOT NULL,
	"to_unit" text NOT NULL,
	"conversion_factor" numeric NOT NULL,
	"category" text,
	"formula" text,
	"description" text,
	"source_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ref_wall_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wall_category" text NOT NULL,
	"wall_type" text NOT NULL,
	"load_bearing" boolean DEFAULT false,
	"exterior_finish" text,
	"interior_finish" text,
	"typical_thickness_mm" numeric,
	"density_kg_m3" numeric,
	"weight_kg_per_m2" numeric,
	"u_value_w_per_m2k" numeric,
	"bricks_per_m2" numeric,
	"mortar_kg_per_m2" numeric,
	"reinforcement_kg_per_m2" numeric,
	"properties" jsonb,
	"source_id" text,
	"confidence_level" numeric,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ref_knowledge_nodes" ADD CONSTRAINT "ref_knowledge_nodes_source_standard_id_ref_standards_id_fk" FOREIGN KEY ("source_standard_id") REFERENCES "public"."ref_standards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ref_material_components" ADD CONSTRAINT "ref_material_components_parent_material_id_ref_materials_id_fk" FOREIGN KEY ("parent_material_id") REFERENCES "public"."ref_materials"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ref_material_components" ADD CONSTRAINT "ref_material_components_component_material_id_ref_materials_id_fk" FOREIGN KEY ("component_material_id") REFERENCES "public"."ref_materials"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
