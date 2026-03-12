/**
 * Server action: run analysis using project digest data + reference library.
 * Scaffold – implement full logic per docs/Library_Setup.md and ConstructionApp_User_Flow_Guide.md.
 */

import { db, ref_materials, ref_standards, ref_building_compositions } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export type AnalyzeProjectInput = {
  slabArea: number;
  slabThickness: number;
  buildingType: string;
  region: string;
};

export type AnalyzeProjectResult = {
  volume: number;
  weight: number;
  compliant: boolean | null;
  codeReference?: string;
  estimatedSteel?: number;
};

export async function analyzeProject(projectData: AnalyzeProjectInput): Promise<AnalyzeProjectResult> {
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
