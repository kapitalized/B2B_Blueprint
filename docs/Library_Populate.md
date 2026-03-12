# Reference Library – How to Populate

Step-by-step instructions for populating the **global reference library** (Neon DB `ref_*` tables). The library is admin-maintained; all data lives in Neon. See **Library_Setup.md** for schema and architecture.

---

## Prerequisites

1. **Neon DB** – Reference tables exist (run migrations after adding the ref_* schema).
2. **Env** – `DATABASE_URL` or `DATABASE_URI` set for scripts and app.
3. **Admin access** – Only admins should run ingestion scripts or use the Admin dashboard to add/edit library data.

---

## Step 1: Run the seed script (baseline data)

Loads baseline materials, building compositions, wall/roof/floor types, and unit conversions. Safe to run once; re-running will insert duplicates unless you add “upsert” or “clear then insert” logic.

1. From project root, run:
   ```bash
   npx tsx scripts/seed-reference-library.ts
   ```
2. Confirm logs: `🌱 Seeding reference library...` then `✅ Reference library seeded successfully`.
3. **Data storage:** Rows go into `ref_materials`, `ref_building_compositions`, `ref_wall_types`, `ref_roof_types`, `ref_flooring_types`, `ref_unit_conversions` in Neon.

**Optional:** To make the script idempotent, add logic to truncate these tables (or delete by `source_name` / marker) before inserting, or use `ON CONFLICT` upserts if you add unique constraints.

---

## Step 2: Get web-scraped / external data (sources)

Use these sources to add more materials, compositions, and standards. Store results in the same `ref_*` tables.

### 2.1 RASMI dataset (building compositions)

- **What:** Material intensity data (concrete, steel, etc. per m²) by building type and region.
- **Where:** [RASMI on GitHub / Nature Scientific Data](https://www.nature.com/articles/s41597-022-01769-6) – dataset with ~3,072 records; CSV or similar.
- **How to get:**
  1. Download the dataset (link from paper or GitHub).
  2. Parse CSV (or provided format); map columns to `ref_building_compositions`: `building_category`, `building_subtype`, `structure_type`, `concrete_intensity_m3_per_m2`, `steel_intensity_kg_per_m2`, `region`, `confidence_interval_low`, `confidence_interval_high`, `source_name`, `confidence_level`, etc.
  3. Normalize units to SI (m, m², m³, kg) using `ref_unit_conversions` if needed.
- **Where to store:** Insert into `ref_building_compositions`. Set `source_id` / `source_name` to `"RASMI Dataset"` (or DOI) for traceability.

### 2.2 NIST concrete mixes

- **What:** Concrete mix designs (cement, water, aggregates, strength).
- **Where:** [NIST LCA Commons](https://www.lciacommons.org/) or NIST concrete mix repository – e.g. 82 mix designs, 9 U.S. national benchmarks.
- **How to get:**
  1. Download or clone the NIST repository / API response.
  2. Parse each mix into: `ref_materials` (concrete entries) and/or `ref_material_components` (cement, water, fine/coarse aggregate per m³, water_cement_ratio, expected_strength_mpa).
  3. Map units to kg/m³ and MPa; use `ref_unit_conversions` if needed.
- **Where to store:** `ref_materials` for each concrete grade; `ref_material_components` for component breakdown linked to that material. Set `source_name` to `"NIST"` or the dataset ID.

### 2.3 Manufacturer / supplier data sheets

- **What:** Densities, strengths, thermal properties from top construction material suppliers.
- **Where:** Manufacturer websites (technical data sheets, PDFs).
- **How to get:**
  1. Use a scraper (e.g. Python with requests/BeautifulSoup or Playwright) or manual export.
  2. Target fields: density, strength grade, dimensions, thermal/acoustic props. Map to `ref_materials` (and optionally `ref_wall_types` / `ref_roof_types` / `ref_flooring_types` if product-specific).
  3. Respect robots.txt and rate limits; prefer official APIs or bulk data if offered.
- **Where to store:** `ref_materials` (and element tables as appropriate). Set `source_name` to manufacturer or dataset name.

### 2.4 Building codes and standards (PDF → structured)

- **What:** Minimum thicknesses, reinforcement rules, fire/safety requirements from Eurocode, SNI, ASTM, IBC, etc.
- **Where:** Official PDFs from standards bodies (e.g. Eurocode, SNI Indonesia, ASTM).
- **How to get:** See **Step 3** (PDF ingestion).

---

## Step 3: PDF ingestion into `ref_standards`

Building codes and manuals are ingested via your existing **Digest** pipeline, then written into `ref_standards` (and optionally into `ref_knowledge_nodes` for semantic search).

1. **Admin project:** Use a dedicated “Admin” or “Library” project in the app (or a script that bypasses project scope).
2. **Upload PDFs:** Upload building-code PDFs (e.g. Eurocode 2, SNI 2847) to that project (or to a staging location your script can read).
3. **Extract text:** Use your existing Digest logic (or a separate script) to:
   - Extract text/sections from each PDF.
   - Parse into structured rows: `authority`, `code_number`, `code_name`, `section`, `clause`, `requirement_type`, `requirement_value_numeric`, `requirement_unit`, `requirement_text`, `description`, `jurisdiction`, `application`, `evaluation_formula`, `source_url`, `pdf_reference`.
4. **Insert into Neon:** For each parsed requirement, insert a row into `ref_standards`. Set `source_url` or `pdf_reference` so you can trace back to the PDF.
5. **Optional – vector sync:** For each new or updated `ref_standards` row (or for chunked manual text), run the **Step 4** pipeline to populate `ref_knowledge_nodes` with embeddings.

**Data storage:** All stored in Neon: `ref_standards` for structured rules; long-form or chunked text can also go into `ref_knowledge_nodes` for semantic search.

---

## Step 4: Vector sync (optional) – `ref_knowledge_nodes` in Neon

Enables semantic search over library text (e.g. “minimum slab thickness for residential”) using Neon’s **pgvector** extension.

1. **Enable pgvector in Neon:** In Neon dashboard, enable the `vector` extension for your project. Add an `embedding` column (e.g. `vector(1536)`) to `ref_knowledge_nodes` via a SQL migration if not already in schema.
2. **Chunk source text:** From `ref_standards` (e.g. `requirement_text`, `description`, `code_name` + `section`) or from raw PDF text, build chunks (e.g. 200–500 tokens with overlap).
3. **Embed chunks:** Call your embedding API (e.g. OpenAI `text-embedding-3-small`) per chunk. Dimension must match your column (e.g. 1536).
4. **Store in Neon:** Insert (or upsert) into `ref_knowledge_nodes`: `content`, `source_standard_id` (FK to `ref_standards.id` if applicable), `metadata` (e.g. `{ "section", "authority" }`), and `embedding`. Use parameterized queries for the vector column.
5. **Sync job:** Run this pipeline whenever you add or update `ref_standards` or bulk-import new reference text (e.g. cron or “Refresh library” in Admin).

**Data storage:** All in Neon: `ref_knowledge_nodes` holds `content` + `embedding`; semantic search is done with pgvector similarity (e.g. cosine) in SQL.

---

## Step 5: Regional and cost factors (optional)

- **Source:** Studies or internal data by region (e.g. Southeast Asia, Europe) for labor/material indices, typical floor heights, foundation types.
- **Where to store:** `ref_regional_factors`: `region`, `country`, `climate_zone`, `concrete_factor`, `steel_factor`, `timber_factor`, `labor_cost_index`, `material_cost_index`, `typical_foundation_type`, `typical_floor_to_floor_height_m`, `source_id`, `confidence_level`, `effective_from` / `effective_to`.

Populate via a small script or Admin UI that reads CSV/JSON and inserts into `ref_regional_factors`.

---

## Data storage summary

| Data type              | Source (examples)           | Storage (Neon)                  |
|------------------------|-----------------------------|---------------------------------|
| Materials              | Seed, NIST, manufacturers   | `ref_materials`, `ref_material_components` |
| Building compositions  | Seed, RASMI                | `ref_building_compositions`     |
| Wall/roof/floor types  | Seed, manuals, suppliers   | `ref_wall_types`, `ref_roof_types`, `ref_flooring_types` |
| Standards / codes      | PDF ingestion (Digest)     | `ref_standards`                 |
| Unit conversions       | Seed, manual               | `ref_unit_conversions`          |
| Reference text (RAG)    | ref_standards + chunking   | `ref_knowledge_nodes` (+ pgvector `embedding`) |
| Regional factors       | Studies, internal data     | `ref_regional_factors`          |

---

## Suggested order of operations

1. Run **Step 1** (seed) so the app has baseline data.
2. Run migrations so all `ref_*` tables (and pgvector if used) exist.
3. Add **Step 2** ingestion scripts (RASMI, NIST, manufacturers) and run them; store output in the tables above.
4. Set up **Step 3** (PDF → `ref_standards`) using your Digest pipeline and an Admin flow.
5. Optionally enable **Step 4** (vector sync to `ref_knowledge_nodes`) and a sync job.
6. Optionally add **Step 5** (regional factors) and an Admin UI for CRUD and data source dashboards.

For detailed schema and field meanings, see **Library_Setup.md**. For how the AI uses the library in analysis, see **ConstructionApp_User_Flow_Guide.md** and the “Library logic loop” in Library_Setup.md.
