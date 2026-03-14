/**
 * Schema: Neon Auth (neon_auth.*) + construction app tables (11 Mar 26 initial + improvements).
 * Run: npx drizzle-kit generate && npx drizzle-kit migrate
 */

import {
  pgTable,
  pgSchema,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  decimal,
  boolean,
} from 'drizzle-orm/pg-core';

// ---- Neon Auth (managed by Neon). Do not modify via migrations. ----
export const neonAuth = pgSchema('neon_auth');

export const users = neonAuth.table('user', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  emailVerified: text('emailVerified'),
  image: text('image'),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
});

// ---- MODULE 1: USER & MEMBERSHIP ----
/** App extension of neon_auth.user: plan, Stripe, storage. id = neon_auth.user.id */
export const user_profiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().references(() => users.id),
  email: text('email').notNull(),
  planType: text('plan_type').default('free').notNull(), // 'free', 'basic', 'premium'
  stripeCustomerId: text('stripe_customer_id'),
  totalStorageUsed: integer('total_storage_used').default(0),
  /** Default org for project create and org switcher (e.g. user's personal org). */
  defaultOrgId: uuid('default_org_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---- ORG (organisations & team members; prefix Org_) ----
/** Organisations: personal (one per user) or team. Projects belong to an org. */
export const org_organisations = pgTable('org_organisations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(), // unique, e.g. 'acme' or 'user-abc123-personal'
  /** Full postal/legal address for the organisation. */
  fullAddress: text('full_address'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  addressPostcode: text('address_postcode'),
  addressStateProvince: text('address_state_province'),
  addressCountry: text('address_country'),
  type: text('type').notNull().default('team'), // 'personal' | 'team'
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  planStatus: text('plan_status'), // 'active', 'canceled', 'past_due', etc.
  planTier: text('plan_tier'), // 'starter' | 'pro' — set from Stripe metadata/price
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Org membership and role. Owner: billing, account. Admin: members + org settings. Analyst: projects, upload, analysis, reports. */
export const org_members = pgTable('org_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => org_organisations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => user_profiles.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'owner' | 'admin' | 'analyst'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---- MODULE 2: PROJECTS & FILE MANAGEMENT ----
/** Projects belong to an organisation. Access: project owner OR org member (any role). */
export const project_main = pgTable('project_main', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => org_organisations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => user_profiles.id), // legacy/creator; access via org or this
  projectName: text('project_name').notNull(),
  projectAddress: text('project_address'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  addressPostcode: text('address_postcode'),
  addressStateProvince: text('address_state_province'),
  addressCountry: text('address_country'),
  projectDescription: text('project_description'), // short description
  projectObjectives: text('project_objectives'), // optional; kept for chat context
  country: text('country'),
  /** Site type for library/compliance: e.g. house, villa, apartment, commercial */
  siteType: text('site_type'),
  projectStatus: text('project_status'), // e.g. Design, Pre-construction, In construction, Completed
  shortId: text('short_id'), // unique 6-char for URLs e.g. /project/abc123/my-building
  slug: text('slug'), // URL slug from name e.g. my-building
  /** Number of building levels (floors); used for floorplan upload slots and overview. */
  numberOfLevels: integer('number_of_levels').default(1),
  status: text('status').default('active'), // 'active', 'archived', 'completed'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const project_files = pgTable('project_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => project_main.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(), // 'plan', 'defect_report', 'contract'
  /** Building level (1-based) for floorplans; null for other docs. */
  buildingLevel: integer('building_level'),
  blobUrl: text('blob_url').notNull(),
  blobKey: text('blob_key').notNull(),
  fileSize: integer('file_size'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// ---- MODULE 3: AI DIGEST & ANALYSIS ----
export const ai_digests = pgTable('ai_digests', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: uuid('file_id').references(() => project_files.id),
  projectId: uuid('project_id').references(() => project_main.id),
  /** Building level (1-based) copied from file for filtering reports. */
  buildingLevel: integer('building_level'),
  rawExtraction: jsonb('raw_extraction').notNull(),
  summary: text('summary'),
  processedAt: timestamp('processed_at').defaultNow(),
});

export const ai_analyses = pgTable('ai_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => project_main.id),
  analysisType: text('analysis_type').notNull(), // 'quantities', 'comparison', 'structural'
  analysisResult: jsonb('analysis_result').notNull(),
  inputSourceIds: jsonb('input_source_ids').notNull(),
  /** Raw extraction from pipeline (items with bbox for overlay). Same run as this analysis. */
  rawExtraction: jsonb('raw_extraction'),
  createdAt: timestamp('created_at').defaultNow(),
  // Run metadata (when from pipeline)
  runStartedAt: timestamp('run_started_at'),
  runDurationMs: integer('run_duration_ms'),
  inputSizeBytes: integer('input_size_bytes'),
  inputPageCount: integer('input_page_count'),
  /** OpenRouter token usage and cost (prompt_tokens, completion_tokens, total_tokens, cost per step). */
  tokenUsage: jsonb('token_usage'),
  /** Model ids used for this run: { extraction, analysis, synthesis }. */
  modelsUsed: jsonb('models_used'),
  /** Per-step trace: prompt preview, response preview, tokens (for debugging and quality). */
  stepTrace: jsonb('step_trace'),
});

export const ai_knowledge_nodes = pgTable('ai_knowledge_nodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => project_main.id),
  fileId: uuid('file_id').references(() => project_files.id),
  content: text('content').notNull(),
  vectorId: text('vector_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---- MODULE 4: INTERACTION & MEMORY ----
export const chat_threads = pgTable('chat_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => project_main.id),
  userId: uuid('user_id').references(() => user_profiles.id),
  title: text('title').notNull(),
  contextSummary: text('context_summary'),
  lastActivity: timestamp('last_activity').defaultNow(),
});

export const chat_messages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').references(() => chat_threads.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  citations: jsonb('citations'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---- MODULE 5: OUTPUT & REPORTS ----
export const report_generated = pgTable('report_generated', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Short ID for URLs e.g. /project/abc123/slug/reports/xy12ab */
  shortId: text('short_id'),
  projectId: uuid('project_id').references(() => project_main.id),
  reportTitle: text('report_title').notNull(),
  reportType: text('report_type').notNull(), // 'quantity_takeoff', 'defect_audit'
  /** Building level (1-based) when report is for a specific level. */
  buildingLevel: integer('building_level'),
  content: text('content'),
  blobUrl: text('blob_url'),
  analysisSourceId: uuid('analysis_source_id').references(() => ai_analyses.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---- LOGS (audit: AI runs, report creation; use logs_ prefix) ----
/** One row per AI provider call (OpenRouter, etc.): model, tokens, cost, context. */
export const logs_ai_runs = pgTable('logs_ai_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  eventType: text('event_type').notNull(), // 'pipeline_run', 'chat_turn', 'batch_step'
  projectId: uuid('project_id').references(() => project_main.id),
  userId: uuid('user_id').references(() => user_profiles.id),
  provider: text('provider').notNull(), // 'openrouter'
  model: text('model'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  cost: decimal('cost'),
  latencyMs: integer('latency_ms'),
  metadata: jsonb('metadata'), // taskId, fileId, threadId, step, etc.
});

/** One row per report creation; links report → analysis → file(s) analysed for traceability. */
export const logs_reports = pgTable('logs_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  projectId: uuid('project_id').references(() => project_main.id).notNull(),
  userId: uuid('user_id').references(() => user_profiles.id),
  reportId: uuid('report_id').references(() => report_generated.id).notNull(),
  analysisId: uuid('analysis_id').references(() => ai_analyses.id).notNull(),
  reportType: text('report_type').notNull(), // 'quantity_takeoff', 'defect_audit'
  source: text('source'), // 'pipeline', 'from_chat', 'python_analyze'
  /** File(s) that were analysed to produce this report (project_files.id). Enables link back from report to source files. */
  fileIds: jsonb('file_ids'), // array of UUID strings
});

// ---- MODULE 6: REFERENCE LIBRARY (global, admin-maintained) ----
// See docs/Library_Setup.md and docs/Library_Populate.md

export const ref_materials = pgTable('ref_materials', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  name: text('name').notNull(),
  standard_grade: text('standard_grade'),
  density_kg_m3: decimal('density_kg_m3'),
  unit_cost_estimate: decimal('unit_cost_estimate'),
  properties: jsonb('properties'),
  source_id: text('source_id'),
  source_name: text('source_name'),
  publication_year: integer('publication_year'),
  confidence_level: decimal('confidence_level'),
  effective_from: timestamp('effective_from').notNull().defaultNow(),
  effective_to: timestamp('effective_to'),
  superseded_by: uuid('superseded_by'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const ref_building_compositions = pgTable('ref_building_compositions', {
  id: uuid('id').defaultRandom().primaryKey(),
  building_category: text('building_category').notNull(),
  building_subtype: text('building_subtype'),
  structure_type: text('structure_type'),
  concrete_intensity_m3_per_m2: decimal('concrete_intensity_m3_per_m2'),
  steel_intensity_kg_per_m2: decimal('steel_intensity_kg_per_m2'),
  rebar_intensity_kg_per_m3_concrete: decimal('rebar_intensity_kg_per_m3_concrete'),
  brick_intensity_m3_per_m2: decimal('brick_intensity_m3_per_m2'),
  timber_intensity_m3_per_m2: decimal('timber_intensity_m3_per_m2'),
  glass_intensity_kg_per_m2: decimal('glass_intensity_kg_per_m2'),
  region: text('region'),
  climate_zone: text('climate_zone'),
  seismic_zone: text('seismic_zone'),
  confidence_interval_low: decimal('confidence_interval_low'),
  confidence_interval_high: decimal('confidence_interval_high'),
  sample_size: integer('sample_size'),
  source_id: text('source_id'),
  source_name: text('source_name'),
  publication_year: integer('publication_year'),
  confidence_level: decimal('confidence_level'),
  properties: jsonb('properties'),
  effective_from: timestamp('effective_from').notNull().defaultNow(),
  effective_to: timestamp('effective_to'),
  superseded_by: uuid('superseded_by'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const ref_wall_types = pgTable('ref_wall_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  wall_category: text('wall_category').notNull(),
  wall_type: text('wall_type').notNull(),
  load_bearing: boolean('load_bearing').default(false),
  exterior_finish: text('exterior_finish'),
  interior_finish: text('interior_finish'),
  typical_thickness_mm: decimal('typical_thickness_mm'),
  density_kg_m3: decimal('density_kg_m3'),
  weight_kg_per_m2: decimal('weight_kg_per_m2'),
  u_value_w_per_m2k: decimal('u_value_w_per_m2k'),
  bricks_per_m2: decimal('bricks_per_m2'),
  mortar_kg_per_m2: decimal('mortar_kg_per_m2'),
  reinforcement_kg_per_m2: decimal('reinforcement_kg_per_m2'),
  properties: jsonb('properties'),
  source_id: text('source_id'),
  confidence_level: decimal('confidence_level'),
  effective_from: timestamp('effective_from').notNull().defaultNow(),
  effective_to: timestamp('effective_to'),
  created_at: timestamp('created_at').defaultNow(),
});

export const ref_roof_types = pgTable('ref_roof_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  roof_form: text('roof_form').notNull(),
  structure_material: text('structure_material'),
  covering_material: text('covering_material'),
  typical_span_m: decimal('typical_span_m'),
  typical_pitch_degrees: decimal('typical_pitch_degrees'),
  typical_weight_kg_per_m2: decimal('typical_weight_kg_per_m2'),
  structure_weight_kg_per_m2: decimal('structure_weight_kg_per_m2'),
  covering_weight_kg_per_m2: decimal('covering_weight_kg_per_m2'),
  timber_intensity_m3_per_m2: decimal('timber_intensity_m3_per_m2'),
  steel_intensity_kg_per_m2: decimal('steel_intensity_kg_per_m2'),
  concrete_intensity_m3_per_m2: decimal('concrete_intensity_m3_per_m2'),
  properties: jsonb('properties'),
  source_id: text('source_id'),
  confidence_level: decimal('confidence_level'),
  effective_from: timestamp('effective_from').notNull().defaultNow(),
  effective_to: timestamp('effective_to'),
  created_at: timestamp('created_at').defaultNow(),
});

export const ref_flooring_types = pgTable('ref_flooring_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  flooring_category: text('flooring_category').notNull(),
  flooring_type: text('flooring_type').notNull(),
  construction_method: text('construction_method'),
  typical_thickness_mm: decimal('typical_thickness_mm'),
  density_kg_m3: decimal('density_kg_m3'),
  weight_kg_per_m2: decimal('weight_kg_per_m2'),
  requires_screed: boolean('requires_screed').default(false),
  screed_thickness_mm: decimal('screed_thickness_mm'),
  screed_density_kg_m3: decimal('screed_density_kg_m3'),
  properties: jsonb('properties'),
  source_id: text('source_id'),
  confidence_level: decimal('confidence_level'),
  effective_from: timestamp('effective_from').notNull().defaultNow(),
  effective_to: timestamp('effective_to'),
  created_at: timestamp('created_at').defaultNow(),
});

export const ref_standards = pgTable('ref_standards', {
  id: uuid('id').defaultRandom().primaryKey(),
  authority: text('authority').notNull(),
  code_number: text('code_number'),
  code_name: text('code_name').notNull(),
  section: text('section').notNull(),
  clause: text('clause'),
  requirement_type: text('requirement_type'),
  requirement_value_numeric: decimal('requirement_value_numeric'),
  requirement_unit: text('requirement_unit'),
  requirement_text: text('requirement_text'),
  description: text('description'),
  jurisdiction: text('jurisdiction'),
  application: text('application'),
  building_types: text('building_types'),
  evaluation_formula: text('evaluation_formula'),
  source_url: text('source_url'),
  pdf_reference: text('pdf_reference'),
  effective_from: timestamp('effective_from'),
  effective_to: timestamp('effective_to'),
  superseded_by: uuid('superseded_by'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const ref_unit_conversions = pgTable('ref_unit_conversions', {
  id: uuid('id').defaultRandom().primaryKey(),
  from_unit: text('from_unit').notNull(),
  to_unit: text('to_unit').notNull(),
  conversion_factor: decimal('conversion_factor').notNull(),
  category: text('category'),
  formula: text('formula'),
  description: text('description'),
  source_id: text('source_id'),
  created_at: timestamp('created_at').defaultNow(),
});

export const ref_material_components = pgTable('ref_material_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  parent_material_id: uuid('parent_material_id').references(() => ref_materials.id),
  component_material_id: uuid('component_material_id').references(() => ref_materials.id),
  proportion_by_mass: decimal('proportion_by_mass'),
  proportion_by_volume: decimal('proportion_by_volume'),
  mix_designation: text('mix_designation'),
  cement_kg_per_m3: decimal('cement_kg_per_m3'),
  water_kg_per_m3: decimal('water_kg_per_m3'),
  fine_aggregate_kg_per_m3: decimal('fine_aggregate_kg_per_m3'),
  coarse_aggregate_kg_per_m3: decimal('coarse_aggregate_kg_per_m3'),
  admixtures: jsonb('admixtures'),
  water_cement_ratio: decimal('water_cement_ratio'),
  expected_strength_mpa: decimal('expected_strength_mpa'),
  source_id: text('source_id'),
  confidence_level: decimal('confidence_level'),
  effective_from: timestamp('effective_from').notNull().defaultNow(),
  effective_to: timestamp('effective_to'),
  created_at: timestamp('created_at').defaultNow(),
});

export const ref_regional_factors = pgTable('ref_regional_factors', {
  id: uuid('id').defaultRandom().primaryKey(),
  region: text('region').notNull(),
  country: text('country'),
  climate_zone: text('climate_zone'),
  concrete_factor: decimal('concrete_factor'),
  steel_factor: decimal('steel_factor'),
  timber_factor: decimal('timber_factor'),
  labor_cost_index: decimal('labor_cost_index'),
  material_cost_index: decimal('material_cost_index'),
  typical_foundation_type: text('typical_foundation_type'),
  typical_floor_to_floor_height_m: decimal('typical_floor_to_floor_height_m'),
  source_id: text('source_id'),
  confidence_level: decimal('confidence_level'),
  effective_from: timestamp('effective_from').notNull().defaultNow(),
  effective_to: timestamp('effective_to'),
  created_at: timestamp('created_at').defaultNow(),
});

export const ref_knowledge_nodes = pgTable('ref_knowledge_nodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  source_standard_id: uuid('source_standard_id').references(() => ref_standards.id),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
});

// ---- APP SETTINGS (admin-configurable, single row) ----
/** OpenRouter model ids per AI step. Single row (id=1). */
export const ai_model_config = pgTable('ai_model_config', {
  id: integer('id').primaryKey().default(1),
  extraction_model: text('extraction_model').notNull(),
  analysis_model: text('analysis_model').notNull(),
  synthesis_model: text('synthesis_model').notNull(),
  chat_model: text('chat_model').notNull(),
  updated_at: timestamp('updated_at').defaultNow(),
});
