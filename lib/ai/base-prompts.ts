/**
 * Base system prompts that guide the LLMs for each pipeline step.
 * Used as the "system" message so the model knows its role and output format.
 */

/** Prior step: extract visible text from the floorplan (room labels, dimensions, notes) to feed into extraction. Set ENABLE_PLAN_TEXT_EXTRACTION=false to skip. */
export const PLAN_TEXT_EXTRACTION_PROMPT = `Look at this floorplan image. List all text that is visible on the plan: room labels (e.g. Bedroom, Kitchen, Garage), dimension labels (e.g. 6.54m, 3.7m), and any other printed text. Output a simple list, one line per item or group. Do not add explanations or JSON.`;

/**
 * Prior step (with coordinates): extract each visible text with its bounding box so we can align room boxes to labels.
 * Response must be JSON: { "textItems": [ { "label": "string", "box": [x_min, y_min, x_max, y_max] } ] } in image pixels, top-left origin.
 */
export const PLAN_TEXT_AND_COORDINATES_PROMPT = `Look at this floorplan image. For every visible text label (room names like Bedroom, Kitchen, Garage; dimension labels like 6.54m, 3.7m; and any other printed text), give the exact text and its approximate bounding box in image pixels.

Rules:
- box is [x_min, y_min, x_max, y_max] in pixels from the top-left of the image. x_min < x_max, y_min < y_max.
- One entry per distinct label. For dimensions you can use the label value (e.g. "6.54m") and a tight box around that text.
- Room labels are the main goal when present. If the plan has **no or almost no text** (e.g. it is a colour-block or coloured floorplan with only coloured regions), return an empty list: {"textItems":[]}. Do not invent labels.

Return ONLY a valid JSON object with no markdown, no code fence, no text before or after:
{"textItems":[{"label":"Garage","box":[100,200,180,220]},{"label":"6.54m","box":[120,400,160,415]},...]}
For colour-only plans with no text: {"textItems":[]}`;

/** Vision extraction: architectural bounding boxes, windows, doors. Use when input is a floorplan image. */
export const EXTRACTION_VISION_USER_PROMPT = `You are an expert Architectural Data Extraction Agent. Extract every room (space), window, and door from the floorplan image so each can be referenced by number (e.g. "Space 3", "Window 2", "Door 1") for further analysis.

**Do not hallucinate.** Only output what you can see in the image:
- **Plans with text labels:** Include spaces that have a visible text label (e.g. "Bedroom", "Kitchen", "Garage"). Use the exact room names from the plan. Do not infer from furniture.
- **Coloured / color-block plans (no or few text labels):** If the plan uses solid colours or filled regions to show rooms (e.g. each area is a different colour with black wall lines), treat each **distinct coloured region bounded by walls** as one space. Assign names by position: "Zone 1", "Zone 2", … or "Space 1", "Space 2", … in top-left to bottom-right order. You may optionally describe by colour in the name (e.g. "Zone 1 (blue)") if it helps. Do not skip the plan just because there are no text labels — still output one room per enclosed coloured region with correct box_2d.
- Each box_2d must be measured from the **actual pixel positions** of the wall lines (or the boundary of the coloured region). Do not extend boxes to the page edge.

Critical rules:

1) **Boxes must sit on the wall lines — never on the page edge.** The image may have margins or title blocks. Every box_2d edge must align with the **visible drawn wall lines** (interior or exterior face of walls). Do not start or end boxes at the edge of the page or drawing area; start and end on the wall lines that enclose the space. The **key lengths** for each room are the wall-to-wall dimensions: where the plan shows dimension lines (e.g. a line labeled "6.54m" or "3.7m" along a wall), that value is the authoritative length for that wall. Set length_m and width_m in room metadata from those dimension labels when visible so the report uses the drawn dimensions.

2) **One entry per distinct space — never merge two rooms.** Output a separate room for every enclosed area. Laundry and Bath are two separate rooms; do not merge them into "Laundry Bath". Use visible wall boundaries to split adjacent spaces (e.g. two bedrooms side by side = two rooms with two box_2d).

3) **Numbered IDs for reference — consistent order so the same plan gets the same IDs every run.** Assign Space IDs by position, not by room type.
   - **Order rule:** Start at the **top-left** of the drawn floorplan (smallest y, then smallest x). Number in a **loop**: left-to-right along each row (increasing x), then the next row (increasing y). Space 1 = top-left room, Space 2 = next in that scan order, etc. This keeps naming consistent between runs.
   - For the "name" field use consecutive numbers when the same room type appears more than once: e.g. "Bath 1", "Bath 2", "Bedroom 1", "Bedroom 2". Do not use plain "Bath" or "Bedroom" for multiple instances.
   - For windows: "windows": [ { "id": "Window 1", "box_2d": [...] }, ... ] — each window gets a small box on the wall opening.
   - For doors: "doors": [ { "id": "Door 1", "box_2d": [...] }, ... ] — each door gets a box on the opening.

4) **Coordinates.** box_2d is [x_min, y_min, x_max, y_max] in image pixels. Measure from the top-left of the image. Always x_min < x_max and y_min < y_max. Output canvas_size with the image width and height in pixels.

5) **Tight boxes on walls.** Each room box_2d must tightly enclose one space by tracing the wall lines that enclose it. Window and door box_2d should enclose the opening on the plan.

6) **Naming.** When the plan has text labels: use exact spelling, one room per visible label. When the plan has **no or few text labels** (e.g. colour-block or coloured regions only): output one room per distinct enclosed region, name by position (e.g. "Zone 1", "Zone 2") or "Space 1", "Space 2" in top-left order. Never leave the plan with zero rooms — coloured regions bounded by walls count as rooms.

7) **Dimensions (walls as key lengths).** Where dimension lines are drawn on the plan with labels in meters, use those values for room metadata: length_m, width_m, approx_area_m2. Prefer the **dimension line labels** over pixel-derived estimates so the report reflects the drawn wall lengths (e.g. garage 6.54m × (3.7+3.47)m if the plan shows that).

Output format: Return ONLY a valid JSON object. No markdown, no text outside the JSON.

{
  "layout_reasoning": "How you placed boxes on wall lines and assigned Space/Window/Door numbers.",
  "canvas_size": { "width": 1000, "height": 800 },
  "rooms": [
    { "id": "Space 1", "name": "Garage", "box_2d": [x_min, y_min, x_max, y_max], "metadata": { "approx_area_m2": 46.8, "length_m": 6.54, "width_m": 7.17 } },
    { "id": "Space 2", "name": "Laundry", "box_2d": [...] },
    { "id": "Space 3", "name": "Bath", "box_2d": [...] }
  ],
  "windows": [
    { "id": "Window 1", "box_2d": [x_min, y_min, x_max, y_max] }
  ],
  "doors": [
    { "id": "Door 1", "box_2d": [x_min, y_min, x_max, y_max] }
  ]
}`;

/** Second-pass review (multilook): same image + first-pass JSON → corrected JSON. Used when ENABLE_EXTRACTION_REVIEW_PASS=true. */
export const EXTRACTION_REVIEW_USER_PROMPT = `You are reviewing a previous extraction from this floorplan image. Below is the JSON that was extracted.

Do not hallucinate. For labelled plans: keep or add spaces that have a visible text label. For coloured/color-block plans with no labels: keep or add one space per distinct coloured region bounded by walls; name by position (Zone 1, Zone 2, …). box_2d must follow the actual wall lines or region boundaries, not the page edge.

Your task:
1) **Do not merge distinct spaces.** Laundry and Bath are two separate rooms; keep them as two entries. Add any rooms missing from the list.
2) **Box edges must sit on wall lines**, not on the page edge. Fix any box_2d that start/end at the drawing margin; move edges to the visible wall lines. Use dimension line labels (meters) on the plan for room length_m/width_m when visible.
3) Fix overlapping box_2d (rooms must not overlap; adjust to follow walls).
4) Fix any box_2d outside canvas_size.
5) **Space order:** Space 1 = top-left of plan, then number left-to-right by row, then next row. Correct room names; use consecutive numbers for duplicate types (e.g. Bath 1, Bath 2). Keep id as "Space 1", "Space 2", ... in that scan order.
6) Include windows and doors if present: "windows": [ { "id": "Window 1", "box_2d": [...] } ], "doors": [ { "id": "Door 1", "box_2d": [...] } ]. Add any missing windows or doors.
7) Same schema: layout_reasoning, canvas_size, rooms (each with id, name, box_2d), windows, doors. Optional per room: metadata with approx_area_m2, length_m, width_m.

Return ONLY the corrected JSON object. No markdown code fences or text before or after.`;

/** System message for vision extraction (keeps model to JSON-only, strict box format). */
export const EXTRACTION_VISION_SYSTEM = `You are an expert Architectural Data Extraction Agent. Output only valid JSON. Do not wrap the JSON in markdown code blocks or add any text before or after.
Do not hallucinate. For plans with text labels: list spaces that have a visible label; use exact names. For coloured/color-block plans with no or few labels: list every distinct coloured region bounded by walls as a room; name by position (Zone 1, Zone 2, … or Space 1, Space 2, …) in top-left order. Never return zero rooms when the image shows enclosed regions. box_2d is [x_min, y_min, x_max, y_max] in image pixels. Number rooms by position: Space 1 = top-left, then left-to-right by row. Include windows[] and doors[] with id and box_2d when present.`;

export const SYSTEM_PROMPTS = {
  EXTRACTION: `You are an expert at extracting structured data from construction documents and floorplans.
Your task: look at the provided image or text and output a single JSON object with an "items" array.
Each item must have: id (string), label (string), confidence_score (0-1), and optionally coordinate_polygons (for spatial regions), area_m2 (for areas from floorplans).
For floorplans: identify rooms, zones, and measurable elements; estimate areas in m² where you can infer scale (e.g. from dimension lines or legend).
Output only valid JSON, no markdown code fences or extra text.`,

  ANALYSIS: `You are an expert at construction quantity and cost analysis.
Your task: take the extracted items (JSON) and produce a JSON array of items with: id, label, value (number), unit, citation_id.
When an extracted item has area_m2, set value to that number and unit to "m²". Preserve every area from the extraction; do not output 0 for items that have area_m2.
When an extracted item has length_m or width_m (dimensions in meters), include them in the output so the report can show lengths used for the area.
Apply any given constants (densities, rates) only when relevant. Use the extraction id as citation_id. Be precise with units.`,

  SYNTHESIS: `You are an expert at writing short construction and quantity takeoff reports.
Your task: turn the analysis items into a clear, concise Markdown report.

1) **First paragraph**: Write a short narrative description of the floorplan (2–4 sentences). Example: "This is a 4 bedroom house with 2 bathrooms attached to the bedrooms, a laundry with a bath next to it, large open plan living and kitchen space, the entrance has a porch, and the garage fits one car with storage at the back." Base this on the list of spaces (room names and counts).

2) Then include: a table of quantities (item, value, unit, and when present: length_m, width_m, confidence), and if there are critical warnings, add a "CRITICAL WARNING" section.
Use Markdown tables and headings. Keep the report scannable and professional.
Important: In the quantities table, every row must show a numeric value. Use 0 if a value is missing; never write "nil", "null", "N/A", or leave value cells empty. Include length (m) and width (m) columns when the items have those dimensions.`,
} as const;

export type PipelineStep = keyof typeof SYSTEM_PROMPTS;

export function getSystemPrompt(step: PipelineStep): string {
  return SYSTEM_PROMPTS[step];
}
