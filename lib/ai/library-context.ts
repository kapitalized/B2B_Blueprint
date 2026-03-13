/**
 * Load reference library (ref_*) and return a flat libraryContext for the pipeline.
 * Used when the request does not provide libraryContext so the pipeline uses DB-backed defaults.
 */

import { db } from '@/lib/db';
import { ref_materials, ref_building_compositions, project_main } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type LibraryContext = Record<string, number | string>;

/**
 * Load project-agnostic defaults from ref_materials and ref_building_compositions.
 * Optional projectId: if provided and project has country/region, prefer matching ref_building_compositions.
 */
export async function loadLibraryContextForPipeline(projectId?: string | null): Promise<LibraryContext> {
  const ctx: LibraryContext = {};

  const [concrete] = await db
    .select({ density_kg_m3: ref_materials.density_kg_m3 })
    .from(ref_materials)
    .where(eq(ref_materials.name, 'Normal Weight Concrete'))
    .limit(1);
  if (concrete?.density_kg_m3 != null) {
    ctx.density_kg_m3 = Number(concrete.density_kg_m3);
    ctx.concrete_density = Number(concrete.density_kg_m3);
  }

  let region: string | null = null;
  let buildingCategory: string | null = null;
  if (projectId) {
    const [project] = await db
      .select({ country: project_main.country, siteType: project_main.siteType })
      .from(project_main)
      .where(eq(project_main.id, projectId))
      .limit(1);
    if (project?.country) region = project.country;
    if (project?.siteType) buildingCategory = project.siteType;
  }

  let row: { concrete_intensity_m3_per_m2: string | null; steel_intensity_kg_per_m2: string | null } | undefined;
  if (region) {
    const [r] = await db
      .select({
        concrete_intensity_m3_per_m2: ref_building_compositions.concrete_intensity_m3_per_m2,
        steel_intensity_kg_per_m2: ref_building_compositions.steel_intensity_kg_per_m2,
      })
      .from(ref_building_compositions)
      .where(eq(ref_building_compositions.region, region))
      .limit(1);
    row = r;
  }
  if (!row && buildingCategory) {
    const [r] = await db
      .select({
        concrete_intensity_m3_per_m2: ref_building_compositions.concrete_intensity_m3_per_m2,
        steel_intensity_kg_per_m2: ref_building_compositions.steel_intensity_kg_per_m2,
      })
      .from(ref_building_compositions)
      .where(eq(ref_building_compositions.building_category, buildingCategory))
      .limit(1);
    row = r;
  }
  if (!row) {
    const [r] = await db
      .select({
        concrete_intensity_m3_per_m2: ref_building_compositions.concrete_intensity_m3_per_m2,
        steel_intensity_kg_per_m2: ref_building_compositions.steel_intensity_kg_per_m2,
      })
      .from(ref_building_compositions)
      .where(eq(ref_building_compositions.building_category, 'house'))
      .limit(1);
    row = r;
  }
  if (row?.concrete_intensity_m3_per_m2 != null) {
    ctx.concrete_intensity_m3_per_m2 = Number(row.concrete_intensity_m3_per_m2);
  }
  if (row?.steel_intensity_kg_per_m2 != null) {
    ctx.steel_intensity_kg_per_m2 = Number(row.steel_intensity_kg_per_m2);
  }

  if (typeof ctx.thickness !== 'number') {
    ctx.thickness = 0.2;
  }

  return ctx;
}
