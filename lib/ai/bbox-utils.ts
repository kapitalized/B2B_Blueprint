/**
 * Bounding box helpers for vision extraction (normalized 0–1000 coords).
 * Use when drawing overlays on floorplan images. See docs/AI_Testing_Prompt_Template.md.
 */

/** Normalized coord: 0 = top/left, 1000 = bottom/right. */
export function scaleCoordinate(val: number, dimension: number): number {
  return (val / 1000) * dimension;
}

/** Convert detection bbox [ymin, xmin, ymax, xmax] to canvas rect { x, y, width, height } in pixel space. */
export function bboxToRect(
  bbox: [number, number, number, number],
  imgWidth: number,
  imgHeight: number
): { x: number; y: number; width: number; height: number } {
  const x = scaleCoordinate(bbox[1], imgWidth);
  const y = scaleCoordinate(bbox[0], imgHeight);
  const width = scaleCoordinate(bbox[3] - bbox[1], imgWidth);
  const height = scaleCoordinate(bbox[2] - bbox[0], imgHeight);
  return { x, y, width, height };
}
