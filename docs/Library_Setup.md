# CONSTRUCTION REFERENCE LIBRARY – SETUP

The **Reference Library** is the backbone of the AI’s reasoning. The **Digest** describes *what* is in the plans (e.g. “Wall A is 5 m long”); the **Library** describes *how* to use that (e.g. “Normal concrete density is 2400 kg/m³”).

The library is **global** and **admin‑maintained**: a single shared catalog of standards and materials, not per‑user. Admins populate it via seed scripts, PDF ingestion, and (optionally) vector sync into Neon.

You need a dedicated **reference schema** in your Neon DB and an **ingestion strategy** to fill it.

---

## 1. Reference library map

| Table group   | Prefix / table       | Function |
|---------------|----------------------|----------|
| **Standards** | `ref_standards`      | Building codes, safety rules, unit conversions |
| **Materials** | `ref_materials`     | Concrete grades, rebar, brick, etc. and their properties |
| **Compositions** | `ref_building_compositions` | Material intensities by building type (house, villa, apartment) |
| **Elements**  | `ref_wall_types`, `ref_roof_types`, `ref_flooring_types` | Wall/roof/floor types with typical weights and properties |
| **Knowledge**  | `ref_knowledge_nodes` | Chunked text from manuals/codes; stored in **Neon** with optional pgvector embedding for semantic search |

All reference data lives in **Neon** (Postgres). For semantic search over long‑form text, use Neon’s **pgvector** extension and store embeddings in `ref_knowledge_nodes`; no separate vector DB is required.

---

## 2. How to populate the library

1. **Seed data** – Run the seed script (below) to load baseline materials, compositions, wall/roof/floor types, and unit conversions.
2. **PDF ingestion** – Use an “Admin” project and your existing **Digest** pipeline to extract rules from building‑code PDFs and write them into `ref_standards`.
3. **Vector sync (optional)** – When adding or updating `ref_standards` (or other reference text), chunk and embed the text, then store it in `ref_knowledge_nodes` in Neon so the AI can do semantic lookup over the library.

---

## 3. DB schema for the library

Add the following to your `lib/db/schema.ts`. Ensure `uuid`, `decimal`, and `boolean` are imported from `drizzle-orm/pg-core` where used. For `ref_knowledge_nodes`, enable the **pgvector** extension in Neon and add an `embedding` column (e.g. `vector(1536)`) via a migration; the table below shows the core columns.

```typescript
// ========================================================
// REFERENCE LIBRARY – ADD TO schema.ts
// ========================================================
// Ensure: import { uuid, decimal } from 'drizzle-orm/pg-core'; (if not already)

/**
 * MODULE 6A: CORE MATERIALS
 */
export const ref_materials = pgTable("ref_materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: text("category").notNull(), // 'concrete', 'steel', 'timber', 'brick', 'aggregate'
  subcategory: text("subcategory"), // 'reinforcing', 'structural', 'finish', 'lightweight'
  name: text("name").notNull(), // e.g., 'Normal Weight Concrete', 'Grade 60 Rebar'
  standard_grade: text("standard_grade"), // 'K-300', 'Grade 60', 'Class A', 'C30/37'
  density_kg_m3: decimal("density_kg_m3"),
  unit_cost_estimate: decimal("unit_cost_estimate"), // For initial budget ideas
  properties: jsonb("properties"), // { "strength": "30MPa", "slump": "12cm", "thermal_conductivity": "1.8" }
  source_id: text("source_id"),
  source_name: text("source_name"), // 'RASMI', 'NIST', 'Eurocode'
  publication_year: integer("publication_year"),
  confidence_level: decimal("confidence_level"), // 0-1
  effective_from: timestamp("effective_from").notNull().defaultNow(),
  effective_to: timestamp("effective_to"),
  superseded_by: uuid("superseded_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

/**
 * MODULE 6B: BUILDING TYPE COMPOSITIONS
 */
export const ref_building_compositions = pgTable("ref_building_compositions", {
  id: uuid("id").defaultRandom().primaryKey(),
  building_category: text("building_category").notNull(), // 'house', 'unit', 'villa', 'apartment'
  building_subtype: text("building_subtype"), // 'lowrise', 'midrise', 'highrise', 'luxury'
  structure_type: text("structure_type"), // 'masonry', 'frame', 'shear wall', 'precast'
  concrete_intensity_m3_per_m2: decimal("concrete_intensity_m3_per_m2"),
  steel_intensity_kg_per_m2: decimal("steel_intensity_kg_per_m2"),
  rebar_intensity_kg_per_m3_concrete: decimal("rebar_intensity_kg_per_m3_concrete"),
  brick_intensity_m3_per_m2: decimal("brick_intensity_m3_per_m2"),
  timber_intensity_m3_per_m2: decimal("timber_intensity_m3_per_m2"),
  glass_intensity_kg_per_m2: decimal("glass_intensity_kg_per_m2"),
  region: text("region"), // 'Southeast Asia', 'North America', 'Europe'
  climate_zone: text("climate_zone"),
  seismic_zone: text("seismic_zone"),
  confidence_interval_low: decimal("confidence_interval_low"),
  confidence_interval_high: decimal("confidence_interval_high"),
  sample_size: integer("sample_size"),
  source_id: text("source_id"),
  source_name: text("source_name"),
  publication_year: integer("publication_year"),
  confidence_level: decimal("confidence_level"),
  properties: jsonb("properties"),
  effective_from: timestamp("effective_from").notNull().defaultNow(),
  effective_to: timestamp("effective_to"),
  superseded_by: uuid("superseded_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

/**
 * MODULE 6C: WALL CONSTRUCTION TYPES
 */
export const ref_wall_types = pgTable("ref_wall_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  wall_category: text("wall_category").notNull(), // 'masonry', 'concrete', 'timber', 'steel frame'
  wall_type: text("wall_type").notNull(), // 'brick cavity', 'precast panel', 'stud frame'
  load_bearing: boolean("load_bearing").default(false),
  exterior_finish: text("exterior_finish"),
  interior_finish: text("interior_finish"),
  typical_thickness_mm: decimal("typical_thickness_mm"),
  density_kg_m3: decimal("density_kg_m3"),
  weight_kg_per_m2: decimal("weight_kg_per_m2"),
  u_value_w_per_m2k: decimal("u_value_w_per_m2k"),
  bricks_per_m2: decimal("bricks_per_m2"),
  mortar_kg_per_m2: decimal("mortar_kg_per_m2"),
  reinforcement_kg_per_m2: decimal("reinforcement_kg_per_m2"),
  properties: jsonb("properties"),
  source_id: text("source_id"),
  confidence_level: decimal("confidence_level"),
  effective_from: timestamp("effective_from").notNull().defaultNow(),
  effective_to: timestamp("effective_to"),
  created_at: timestamp("created_at").defaultNow(),
});

/**
 * MODULE 6D: ROOF CONSTRUCTION TYPES
 */
export const ref_roof_types = pgTable("ref_roof_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  roof_form: text("roof_form").notNull(), // 'flat', 'gable', 'hip', 'shed', etc.
  structure_material: text("structure_material"),
  covering_material: text("covering_material"),
  typical_span_m: decimal("typical_span_m"),
  typical_pitch_degrees: decimal("typical_pitch_degrees"),
  typical_weight_kg_per_m2: decimal("typical_weight_kg_per_m2"),
  structure_weight_kg_per_m2: decimal("structure_weight_kg_per_m2"),
  covering_weight_kg_per_m2: decimal("covering_weight_kg_per_m2"),
  timber_intensity_m3_per_m2: decimal("timber_intensity_m3_per_m2"),
  steel_intensity_kg_per_m2: decimal("steel_intensity_kg_per_m2"),
  concrete_intensity_m3_per_m2: decimal("concrete_intensity_m3_per_m2"),
  properties: jsonb("properties"),
  source_id: text("source_id"),
  confidence_level: decimal("confidence_level"),
  effective_from: timestamp("effective_from").notNull().defaultNow(),
  effective_to: timestamp("effective_to"),
  created_at: timestamp("created_at").defaultNow(),
});

/**
 * MODULE 6E: FLOORING CONSTRUCTION TYPES
 */
export const ref_flooring_types = pgTable("ref_flooring_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  flooring_category: text("flooring_category").notNull(),
  flooring_type: text("flooring_type").notNull(),
  construction_method: text("construction_method"),
  typical_thickness_mm: decimal("typical_thickness_mm"),
  density_kg_m3: decimal("density_kg_m3"),
  weight_kg_per_m2: decimal("weight_kg_per_m2"),
  requires_screed: boolean("requires_screed").default(false),
  screed_thickness_mm: decimal("screed_thickness_mm"),
  screed_density_kg_m3: decimal("screed_density_kg_m3"),
  properties: jsonb("properties"),
  source_id: text("source_id"),
  confidence_level: decimal("confidence_level"),
  effective_from: timestamp("effective_from").notNull().defaultNow(),
  effective_to: timestamp("effective_to"),
  created_at: timestamp("created_at").defaultNow(),
});

/**
 * MODULE 6F: STANDARDS & BUILDING CODES
 */
export const ref_standards = pgTable("ref_standards", {
  id: uuid("id").defaultRandom().primaryKey(),
  authority: text("authority").notNull(), // 'Eurocode', 'SNI', 'ASTM', 'IBC', 'NZS'
  code_number: text("code_number"),
  code_name: text("code_name").notNull(),
  section: text("section").notNull(),
  clause: text("clause"),
  requirement_type: text("requirement_type"), // 'minimum', 'maximum', 'prescriptive', 'formula'
  requirement_value_numeric: decimal("requirement_value_numeric"),
  requirement_unit: text("requirement_unit"),
  requirement_text: text("requirement_text"),
  description: text("description"),
  jurisdiction: text("jurisdiction"),
  application: text("application"), // 'residential', 'commercial', 'all'
  building_types: text("building_types"),
  evaluation_formula: text("evaluation_formula"),
  source_url: text("source_url"),
  pdf_reference: text("pdf_reference"),
  effective_from: timestamp("effective_from"),
  effective_to: timestamp("effective_to"),
  superseded_by: uuid("superseded_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

/**
 * MODULE 6G: UNIT CONVERSIONS
 */
export const ref_unit_conversions = pgTable("ref_unit_conversions", {
  id: uuid("id").defaultRandom().primaryKey(),
  from_unit: text("from_unit").notNull(),
  to_unit: text("to_unit").notNull(),
  conversion_factor: decimal("conversion_factor").notNull(),
  category: text("category"), // 'density', 'pressure', 'length', 'area', 'volume', 'mass'
  formula: text("formula"),
  description: text("description"),
  source_id: text("source_id"),
  created_at: timestamp("created_at").defaultNow(),
});

/**
 * MODULE 6H: MATERIAL COMPOSITION RELATIONSHIPS
 */
export const ref_material_components = pgTable("ref_material_components", {
  id: uuid("id").defaultRandom().primaryKey(),
  parent_material_id: uuid("parent_material_id").references(() => ref_materials.id),
  component_material_id: uuid("component_material_id").references(() => ref_materials.id),
  proportion_by_mass: decimal("proportion_by_mass"),
  proportion_by_volume: decimal("proportion_by_volume"),
  mix_designation: text("mix_designation"),
  cement_kg_per_m3: decimal("cement_kg_per_m3"),
  water_kg_per_m3: decimal("water_kg_per_m3"),
  fine_aggregate_kg_per_m3: decimal("fine_aggregate_kg_per_m3"),
  coarse_aggregate_kg_per_m3: decimal("coarse_aggregate_kg_per_m3"),
  admixtures: jsonb("admixtures"),
  water_cement_ratio: decimal("water_cement_ratio"),
  expected_strength_mpa: decimal("expected_strength_mpa"),
  source_id: text("source_id"),
  confidence_level: decimal("confidence_level"),
  effective_from: timestamp("effective_from").notNull().defaultNow(),
  effective_to: timestamp("effective_to"),
  created_at: timestamp("created_at").defaultNow(),
});

/**
 * MODULE 6I: REGIONAL ADJUSTMENT FACTORS
 */
export const ref_regional_factors = pgTable("ref_regional_factors", {
  id: uuid("id").defaultRandom().primaryKey(),
  region: text("region").notNull(),
  country: text("country"),
  climate_zone: text("climate_zone"),
  concrete_factor: decimal("concrete_factor"),
  steel_factor: decimal("steel_factor"),
  timber_factor: decimal("timber_factor"),
  labor_cost_index: decimal("labor_cost_index"),
  material_cost_index: decimal("material_cost_index"),
  typical_foundation_type: text("typical_foundation_type"),
  typical_floor_to_floor_height_m: decimal("typical_floor_to_floor_height_m"),
  source_id: text("source_id"),
  confidence_level: decimal("confidence_level"),
  effective_from: timestamp("effective_from").notNull().defaultNow(),
  effective_to: timestamp("effective_to"),
  created_at: timestamp("created_at").defaultNow(),
});

/**
 * MODULE 6J: REFERENCE KNOWLEDGE NODES (semantic search over library text)
 * Chunked text from building manuals/codes. Enable pgvector in Neon and add
 * an embedding column (e.g. vector(1536)) via migration for similarity search.
 */
export const ref_knowledge_nodes = pgTable("ref_knowledge_nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  source_standard_id: uuid("source_standard_id").references(() => ref_standards.id), // optional link to ref_standards
  metadata: jsonb("metadata"), // e.g. { "section": "...", "authority": "Eurocode" }
  created_at: timestamp("created_at").defaultNow(),
  // embedding: add via migration with pgvector; dimension depends on embedding model (e.g. 1536)
});
```

---

## 4. Seed script

Create **`scripts/seed-reference-library.ts`** and run: `npx tsx scripts/seed-reference-library.ts` (from project root). Imports assume the script lives in `scripts/` and use the project’s `lib/db`.

```typescript
import {
  db,
  ref_materials,
  ref_building_compositions,
  ref_wall_types,
  ref_roof_types,
  ref_flooring_types,
  ref_unit_conversions,
} from '../lib/db';

async function seedReferenceLibrary() {
  console.log('🌱 Seeding reference library...');

  await db.insert(ref_materials).values([
    { category: 'concrete', subcategory: 'normal weight', name: 'Normal Weight Concrete', density_kg_m3: '2400', properties: { strength: '20-40 MPa', thermal_conductivity: '1.8' }, source_name: 'Eurocode', confidence_level: '0.95' },
    { category: 'concrete', subcategory: 'lightweight', name: 'Lightweight Concrete', density_kg_m3: '1800', properties: { strength: '15-30 MPa' }, source_name: 'ACI 213', confidence_level: '0.9' },
    { category: 'steel', subcategory: 'reinforcing', name: 'Mild Steel Rebar', density_kg_m3: '7850', properties: { yield_strength: '250 MPa', grade: 'Grade 250' }, source_name: 'ASTM A615', confidence_level: '0.98' },
    { category: 'steel', subcategory: 'reinforcing', name: 'High Yield Rebar', density_kg_m3: '7850', properties: { yield_strength: '500 MPa', grade: 'Grade 500' }, source_name: 'ASTM A615', confidence_level: '0.98' },
    { category: 'steel', subcategory: 'structural', name: 'Structural Steel', density_kg_m3: '7850', properties: { grade: 'S275', yield_strength: '275 MPa' }, source_name: 'Eurocode 3', confidence_level: '0.98' },
    { category: 'timber', subcategory: 'softwood', name: 'Structural Pine', density_kg_m3: '600', properties: { strength_class: 'C24', moisture_content: '12%' }, source_name: 'EN 338', confidence_level: '0.85' },
    { category: 'timber', subcategory: 'hardwood', name: 'Oak', density_kg_m3: '1000', properties: { strength_class: 'D30' }, source_name: 'EN 338', confidence_level: '0.85' },
    { category: 'brick', subcategory: 'clay', name: 'Common Clay Brick', density_kg_m3: '1900', properties: { size: '215x102.5x65mm', compressive_strength: '10 MPa' }, source_name: 'BS 3921', confidence_level: '0.9' },
    { category: 'aggregate', name: 'Crushed Stone', density_kg_m3: '1600', source_name: 'ACI', confidence_level: '0.85' },
    { category: 'aggregate', name: 'Sand (dry)', density_kg_m3: '1500', source_name: 'ACI', confidence_level: '0.85' },
  ]);

  await db.insert(ref_building_compositions).values([
    { building_category: 'house', structure_type: 'masonry', concrete_intensity_m3_per_m2: '0.25', steel_intensity_kg_per_m2: '25', region: 'Southeast Asia', source_name: 'RASMI Dataset', confidence_level: '0.7' },
    { building_category: 'villa', structure_type: 'frame', concrete_intensity_m3_per_m2: '0.32', steel_intensity_kg_per_m2: '38', region: 'Southeast Asia', source_name: 'RASMI Dataset', confidence_level: '0.7' },
    { building_category: 'apartment', building_subtype: 'lowrise', structure_type: 'masonry', concrete_intensity_m3_per_m2: '0.30', steel_intensity_kg_per_m2: '30', confidence_interval_low: '0.28', confidence_interval_high: '0.33', source_name: 'RASMI Dataset', confidence_level: '0.75' },
    { building_category: 'apartment', building_subtype: 'midrise', structure_type: 'frame', concrete_intensity_m3_per_m2: '0.34', steel_intensity_kg_per_m2: '40', confidence_interval_low: '0.32', confidence_interval_high: '0.36', source_name: 'RASMI Dataset', confidence_level: '0.75' },
    { building_category: 'apartment', building_subtype: 'highrise', structure_type: 'frame', concrete_intensity_m3_per_m2: '0.45', steel_intensity_kg_per_m2: '68', confidence_interval_low: '0.42', confidence_interval_high: '0.48', source_name: 'RASMI Dataset', confidence_level: '0.7' },
  ]);

  await db.insert(ref_wall_types).values([
    { wall_category: 'masonry', wall_type: 'brick cavity', load_bearing: true, typical_thickness_mm: '240', density_kg_m3: '1900', bricks_per_m2: '128', mortar_kg_per_m2: '25', u_value_w_per_m2k: '1.5', source_name: 'CIBSE Guide', confidence_level: '0.85' },
    { wall_category: 'concrete', wall_type: 'precast panel', load_bearing: true, typical_thickness_mm: '150', density_kg_m3: '2400', reinforcement_kg_per_m2: '5', u_value_w_per_m2k: '3.3', source_name: 'PCI Design Handbook', confidence_level: '0.9' },
    { wall_category: 'timber', wall_type: 'stud frame', load_bearing: true, typical_thickness_mm: '140', density_kg_m3: '600', u_value_w_per_m2k: '0.45', properties: { insulation: 'mineral wool 100mm' }, source_name: 'UK Building Regs', confidence_level: '0.8' },
  ]);

  await db.insert(ref_roof_types).values([
    { roof_form: 'flat', structure_material: 'concrete slab', covering_material: 'membrane', typical_span_m: '6', typical_weight_kg_per_m2: '350', concrete_intensity_m3_per_m2: '0.15', source_name: 'Building Standards', confidence_level: '0.85' },
    { roof_form: 'gable', structure_material: 'timber truss', covering_material: 'clay tiles', typical_span_m: '8', typical_pitch_degrees: '30', typical_weight_kg_per_m2: '60', timber_intensity_m3_per_m2: '0.03', source_name: 'TRADA', confidence_level: '0.8' },
    { roof_form: 'hip', structure_material: 'timber truss', covering_material: 'concrete tiles', typical_span_m: '7', typical_pitch_degrees: '25', typical_weight_kg_per_m2: '55', timber_intensity_m3_per_m2: '0.035', source_name: 'TRADA', confidence_level: '0.8' },
    { roof_form: 'shed', structure_material: 'steel frame', covering_material: 'metal sheets', typical_span_m: '12', typical_pitch_degrees: '5', typical_weight_kg_per_m2: '25', steel_intensity_kg_per_m2: '12', source_name: 'Steel Construction Institute', confidence_level: '0.85' },
  ]);

  await db.insert(ref_flooring_types).values([
    { flooring_category: 'timber', flooring_type: 'hardwood', construction_method: 'solid', typical_thickness_mm: '20', density_kg_m3: '700', weight_kg_per_m2: '14', requires_screed: true, screed_thickness_mm: '50', screed_density_kg_m3: '2200', source_name: 'Timber Research', confidence_level: '0.8' },
    { flooring_category: 'tile', flooring_type: 'porcelain', construction_method: 'solid', typical_thickness_mm: '10', density_kg_m3: '2300', weight_kg_per_m2: '23', requires_screed: true, screed_thickness_mm: '50', screed_density_kg_m3: '2200', source_name: 'Tile Association', confidence_level: '0.85' },
    { flooring_category: 'concrete', flooring_type: 'polished concrete', construction_method: 'trowelled', typical_thickness_mm: '100', density_kg_m3: '2400', weight_kg_per_m2: '240', requires_screed: false, source_name: 'Concrete Society', confidence_level: '0.9' },
    { flooring_category: 'vinyl', flooring_type: 'LVT', construction_method: 'floating', typical_thickness_mm: '5', density_kg_m3: '1400', weight_kg_per_m2: '7', requires_screed: true, screed_thickness_mm: '30', screed_density_kg_m3: '2200', source_name: 'Manufacturer Data', confidence_level: '0.7' },
  ]);

  await db.insert(ref_unit_conversions).values([
    { from_unit: 'kg/m³', to_unit: 'lb/ft³', conversion_factor: '0.0624', category: 'density' },
    { from_unit: 'MPa', to_unit: 'psi', conversion_factor: '145.038', category: 'pressure' },
    { from_unit: 'mm', to_unit: 'inches', conversion_factor: '0.03937', category: 'length' },
    { from_unit: 'm', to_unit: 'ft', conversion_factor: '3.28084', category: 'length' },
    { from_unit: 'm²', to_unit: 'ft²', conversion_factor: '10.7639', category: 'area' },
    { from_unit: 'kN/m²', to_unit: 'psf', conversion_factor: '20.8855', category: 'pressure' },
  ]);

  console.log('✅ Reference library seeded successfully');
}

seedReferenceLibrary().catch(console.error);
```

---

## 5. Library logic loop (for the User Flow Guide)

Add this to **ConstructionApp_User_Flow_Guide.md** so the AI consistently uses the library:

1. **Query** – User asks e.g. for concrete volume.
2. **Digest** – AI reads slab area and thickness from `ai_digests`.
3. **Library lookup** – AI queries `ref_materials` (e.g. “Normal Weight Concrete”) for density.
4. **Calculation** – e.g. Area × Thickness × Density.
5. **Validation** – AI checks `ref_standards` for minimum slab thickness (and jurisdiction) and passes/fails.
6. **Result** – AI returns volume and a short code check citation.

---

## 6. Where this sits in the app

- **Admin dashboard** – Restricted area for admins to upload PDF standards and edit material/composition data.
- **Analysis** – A Next.js Server Action (e.g. `analyzeProject`) that has access to both **project data** (digests, analyses) and the **reference library** (ref_* tables and, if used, `ref_knowledge_nodes`).

---

## 7. Server action example

Create e.g. **`app/actions/analyzeProject.ts`**. Use Drizzle’s `select().from().where().limit(1)` and take the first row. Imports use your app’s `@/lib/db` (which exports `db` and schema).

```typescript
import { db, ref_materials, ref_standards, ref_building_compositions } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function analyzeProject(projectData: {
  slabArea: number;
  slabThickness: number;
  buildingType: string;
  region: string;
}) {
  const { slabArea, slabThickness, buildingType, region } = projectData;

  const [concrete] = await db
    .select()
    .from(ref_materials)
    .where(eq(ref_materials.name, 'Normal Weight Concrete'))
    .limit(1);

  const [composition] = await db
    .select()
    .from(ref_building_compositions)
    .where(
      and(
        eq(ref_building_compositions.building_category, buildingType),
        eq(ref_building_compositions.region, region)
      )
    )
    .limit(1);

  const [codeRequirement] = await db
    .select()
    .from(ref_standards)
    .where(
      and(
        eq(ref_standards.section, 'Minimum slab thickness'),
        eq(ref_standards.application, 'residential')
      )
    )
    .limit(1);

  const volume = slabArea * (slabThickness / 1000);
  const weight = volume * Number(concrete?.density_kg_m3 ?? 0);
  const compliant =
    codeRequirement?.requirement_value_numeric != null
      ? slabThickness >= Number(codeRequirement.requirement_value_numeric)
      : null;

  return {
    volume,
    weight,
    compliant,
    codeReference: codeRequirement?.code_number ?? undefined,
    estimatedSteel:
      composition?.steel_intensity_kg_per_m2 != null
        ? Number(composition.steel_intensity_kg_per_m2) * slabArea
        : undefined,
  };
}
```

---

## 8. Items requiring further scoping

### 8.1 Data ingestion pipelines

| Pipeline | Description | Priority |
|----------|-------------|----------|
| **RASMI dataset** | Parse and import material intensity records; handle confidence intervals and regional variation. | High |
| **NIST concrete mixes** | Parser for NIST LCA Commons mix designs. | High |
| **PDF building code scraper** | Extend Digest to extract structured requirements into `ref_standards` (Eurocode, SNI, etc.). | High |
| **Manufacturer data** | Scraper for technical data sheets from major suppliers. | Medium |
| **Historical libraries** | Pan-European historical material data (Zenodo); temporal versioning and unit conversions. | Low |

### 8.2 Neon pgvector for reference library

| Component | Description |
|-----------|-------------|
| **pgvector extension** | Enable in Neon; add `embedding` column to `ref_knowledge_nodes` (e.g. `vector(1536)`). |
| **Sync job** | When `ref_standards` or other reference text is added/updated, chunk, embed, and upsert into `ref_knowledge_nodes`. |
| **Semantic search API** | Server action or API that embeds the query and runs similarity search on `ref_knowledge_nodes` in Neon. |
| **Hybrid search** | Combine vector similarity with filters (jurisdiction, building type, effective date) in SQL. |

### 8.3 Admin interface

| Feature | Description |
|---------|-------------|
| **PDF upload & processing** | Upload building codes; preview extracted requirements before saving to `ref_standards`. |
| **Material editor** | CRUD for `ref_materials` with version history. |
| **Composition manager** | Define building-type compositions and confidence levels. |
| **Data source dashboard** | Coverage, confidence by region, data freshness. |

### 8.4 Testing & validation

| Component | Description |
|-----------|-------------|
| **Cross-source validation** | Compare overlapping sources (e.g. RASMI vs NIST); flag large deviations. |
| **Temporal consistency** | Superseded records and correct effective dates. |
| **Unit conversion tests** | Verify conversion factors and edge cases. |
| **Regional applicability** | Define which compositions apply to which building types and regions. |
