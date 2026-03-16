/**
 * Floorplan extraction validation (see docs/Self_Correct_Analysis.md).
 * Checks: coordinate validity & bounds, optional area consistency, spatial overlaps.
 * Used to decide whether to re-run extraction with correction feedback.
 */

export interface RoomForValidation {
  name?: string;
  /** Alias for name (e.g. from extraction items). */
  label?: string;
  box_2d?: number[];
  metadata?: { approx_area_m2?: number };
  area?: number;
}

/**
 * Validates rooms against canvas. Returns a list of error messages (empty if valid).
 * - Invalid coordinates: x1 >= x2 or y1 >= y2
 * - Boundary violations: box outside canvas
 * - Overlaps: two rooms overlap by more than 1% of the smaller room's area (tolerance for shared walls)
 * - Area consistency (optional): when room has numeric area in same units as box, geometry area must match within tolerance
 */
export function validateFloorplan(
  rooms: RoomForValidation[],
  canvasWidth: number,
  canvasHeight: number,
  options?: { areaTolerance?: number; overlapToleranceFraction?: number }
): string[] {
  const errors: string[] = [];
  const areaTol = options?.areaTolerance ?? 1;
  const overlapTol = options?.overlapToleranceFraction ?? 0.01;

  if (!Array.isArray(rooms) || rooms.length === 0) return errors;
  const w = Number(canvasWidth);
  const h = Number(canvasHeight);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
    errors.push('Invalid canvas_size: width and height must be positive numbers.');
    return errors;
  }

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const name = room?.name ?? room?.label ?? `Room ${i + 1}`;
    const box = room?.box_2d;
    if (!Array.isArray(box) || box.length < 4) {
      errors.push(`${name}: Missing or invalid box_2d (need [x_min, y_min, x_max, y_max]).`);
      continue;
    }
    const x1 = Number(box[0]);
    const y1 = Number(box[1]);
    const x2 = Number(box[2]);
    const y2 = Number(box[3]);
    if ([x1, y1, x2, y2].some((n) => !Number.isFinite(n))) {
      errors.push(`${name}: box_2d must contain four numbers.`);
      continue;
    }

    // 1. Coordinate validity
    if (x1 >= x2 || y1 >= y2) {
      errors.push(`${name}: Invalid coordinates (x1 >= x2 or y1 >= y2).`);
    }

    // 2. Bounds
    if (x1 < 0 || y1 < 0 || x2 > w || y2 > h) {
      errors.push(`${name}: Box [${x1}, ${y1}, ${x2}, ${y2}] exceeds canvas ${w}x${h}.`);
    }

    const calcArea = (x2 - x1) * (y2 - y1);

    // Area consistency: only when room reports area in same units (e.g. pixel²); we have m² in metadata so skip unless we add scale
    const statedArea = room?.area;
    if (typeof statedArea === 'number' && Number.isFinite(statedArea) && statedArea >= 0 && calcArea > 0 && Math.abs(calcArea - statedArea) > areaTol) {
      errors.push(`${name}: Geometry implies area ${calcArea.toFixed(1)}, but extraction says ${statedArea}.`);
    }

    // 3. Overlaps with later rooms
    for (let j = i + 1; j < rooms.length; j++) {
      const other = rooms[j];
      const obox = other?.box_2d;
      if (!Array.isArray(obox) || obox.length < 4) continue;
      const ox1 = Number(obox[0]);
      const oy1 = Number(obox[1]);
      const ox2 = Number(obox[2]);
      const oy2 = Number(obox[3]);
      const interW = Math.max(0, Math.min(x2, ox2) - Math.max(x1, ox1));
      const interH = Math.max(0, Math.min(y2, oy2) - Math.max(y1, oy1));
      const interArea = interW * interH;
      const otherArea = (ox2 - ox1) * (oy2 - oy1);
      const minArea = Math.min(calcArea, otherArea);
      if (minArea > 0 && interArea > overlapTol * minArea) {
        const otherName = other?.name ?? other?.label ?? `Room ${j + 1}`;
        errors.push(`CRITICAL OVERLAP: ${name} and ${otherName}.`);
      }
    }
  }

  return errors;
}
