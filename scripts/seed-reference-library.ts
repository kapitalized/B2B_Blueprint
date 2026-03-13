/**
 * Seed the global reference library (ref_* tables).
 * Run from project root: npx tsx scripts/seed-reference-library.ts
 * Requires DATABASE_URL (or DATABASE_URI) in env.
 */

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
  ] as unknown as (typeof ref_wall_types.$inferInsert)[]);

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
