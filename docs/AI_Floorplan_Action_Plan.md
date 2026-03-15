# AI Floorplan Workflow: Combined Analysis and Stepwise Action Plan

## 1. Combined failure analysis

### From test runs (test4, test3, test2, test1)

- **Extraction (Step 1)** often returns valid JSON: real room names (Garage, Bedroom, Bath, …), `box_2d`, `canvas_size`. So the vision model *can* produce the right structure.
- **Report and data_payload** show generic "Room" and 0 m². So:
  - **Names are lost** between extraction and synthesis (either at parse, or at calculate/merge).
  - **Areas are zero** when the model leaves `metadata: {}` (no `approx_area_m2`); there is no fallback to derive area from `box_2d`.
- **Bounding boxes** sometimes don’t appear in the overlay: either `rawExtraction` in DB has no `coordinate_polygons`, or overlay didn’t support `rooms`+`box_2d` (fallback now added).

### From user feedback (root-cause view)

- **Vision model:** Using `gpt-4o-mini` for extraction is less reliable for spatial/coordinate precision than Gemini 2.0 Flash; when Admin sets extraction to gpt-4o-mini, we still use it.
- **Schema mismatch:** If the model returns a different shape, the parser can fall back to a stub and downstream gets zeros.
- **Coordinate confusion:** Wrong axis order or invalid boxes (e.g. `x1 >= x2`) can trigger validation errors; if we then keep a bad retry or don’t retry correctly, we get zeroed output.
- **Area fallback:** When Analysis (or calculate) returns zeros but Extraction had (or could have) area, we should still show non-zero values; we have merge logic but no fallback when extraction has no `approx_area_m2` (e.g. compute from `box_2d`).
- **Image delivery:** If the vision model gets a broken or empty image (e.g. private blob not converted to data URL), output will be generic/zero.

---

## 2. What’s already in place

| Item | Status |
|------|--------|
| Validation (`validate-floorplan.ts`) | Implemented; checks bounds, overlaps, invalid coords. |
| Retry on validation errors | Implemented; one retry with feedback; **retry content used only if it passes validation**. |
| Area fallback (analysis path) | Implemented: if analysis is all zeros and extraction has `approx_area_m2`, analysis items are replaced from extraction. |
| Merge extraction into report items | Implemented: by-index merge prefers extraction label and area when better. |
| Post-parse name fix | Implemented: when parsed labels are generic ("Room", "Room 1"), copy names from raw `rooms` by index. |
| Overlay fallback for `rooms` schema | Implemented: overlay API can build boxes from step trace `responsePreview` (rooms + box_2d + canvas_size). |
| Vision model fallback | Implemented: `getExtractionModelForVision(configured)` uses Gemini when configured model is not vision-capable; **does not override** when user selects gpt-4o-mini (which is vision). |
| Private blob → data URL | Implemented: `privateBlobToDataUrl` used when `fileUrl` is private blob. |
| Default extraction in `model-selector` | Default is `google/gemini-2.0-flash-001`; Admin can override to gpt-4o-mini. |
| **Plan text extraction (prior step)** | Implemented: when `ENABLE_PLAN_TEXT_EXTRACTION` is not `false`/`0`, a vision call extracts visible text (room labels, dimensions) from the plan, then that text is prepended to the extraction prompt. Set `ENABLE_PLAN_TEXT_EXTRACTION=false` to skip. Single-pass and multilook both use it. |

---

## 3. Stepwise action plan

### Phase A: Ensure extraction output is used (names + boxes)

| Step | Action | Owner/File | Notes |
|------|--------|------------|--------|
| **A1** | **Always prefer extraction names from raw JSON by index** | `lib/ai/orchestrator.ts` | After `parseExtraction`, when we have vision and `parsed.rooms` with same length as `raw_extraction.items`, **always** set `raw_extraction.items[i].label` from `parsed.rooms[i].name` (and fallbacks: `Name`, `room_name`, `label`). Do this for every index, not only when current label is generic. This prevents "Room" when the model did return real names. |
| **A2** | **Ensure calculate payload uses extraction labels** | `lib/ai/orchestrator.ts` | When building payload for `callPythonEngine('/calculate')`, use `label: (i.label && String(i.label).trim()) || i.id || 'Room'` (already present). Confirm no other path overwrites labels before this. |
| **A3** | **Optional: persist raw extraction JSON for report/overlay** | `lib/ai/persistence.ts`, overlay/report usage | Store the raw extraction response string (or `rooms` + `canvas_size`) on the analysis row. When building report items or overlay, prefer names and boxes from this stored blob so we are not dependent on a single parse. |

### Phase B: Vision model and prompts (reliability)

| Step | Action | Owner/File | Notes |
|------|--------|------------|--------|
| **B1** | **Enforce Gemini 2.0 Flash for vision extraction** | `lib/ai/openrouter-models.ts` or `lib/ai/orchestrator.ts` | When `fileUrl` is present (vision extraction), **always** use `google/gemini-2.0-flash-001` for the extraction step, ignoring Admin extraction model for this step. Alternatively: in Admin, make extraction model read-only when "vision" is detected, or show a note that Gemini is recommended. Simplest: in orchestrator, for vision calls use `getExtractionModelForVision(extractionModel)` and change that to **always return** `DEFAULT_VISION_EXTRACTION_MODEL` when a vision request is made (so Admin choice is only for non-vision extraction). |
| **B2** | **Strict system prompt with few-shot box_2d example** | `lib/ai/base-prompts.ts` | In `EXTRACTION_VISION_SYSTEM` or the user prompt, add a single clear example: e.g. `"Example room entry: {\"name\": \"Kitchen\", \"box_2d\": [100, 200, 300, 400]}"` and state that `box_2d` is always `[x_min, y_min, x_max, y_max]` in image pixels, with `x_min < x_max` and `y_min < y_max`. Reduces guessing and axis flip. |
| **B3** | **Plan-mode style: describe adjacencies before coordinates** | `lib/ai/base-prompts.ts` | In `EXTRACTION_VISION_USER_PROMPT`, add an instruction: before outputting JSON, briefly describe room adjacencies in text (e.g. "Kitchen is north of living room; Bedroom 1 shares a wall with Bath"). Then output the same schema. This encourages a mental map and can reduce overlapping or wrong boxes. |

### Phase C: Validation and retry (already wired; tighten if needed)

| Step | Action | Owner/File | Notes |
|------|--------|------------|--------|
| **C1** | **Validation hook** | Already done | `validate-floorplan.ts` is called after first extraction; on errors we retry once with feedback; we only replace content with retry if retry passes validation. No change required unless we want to retry **only** on specific errors (e.g. `x1 >= x2`) and skip retry for overlaps. |
| **C2** | **Optional: immediate retry on invalid box** | `lib/ai/orchestrator.ts` | If validation reports "Invalid coordinates (x1 >= x2 or y1 >= y2)", could trigger a second retry with a very short feedback message. Low priority if C1 is already working. |

### Phase D: Area fallback when metadata is empty

| Step | Action | Owner/File | Notes |
|------|--------|------------|--------|
| **D1** | **Compute area from box_2d when metadata has no approx_area_m2** | `lib/ai/orchestrator.ts` | In `mapRoomsToItems` (or a single pass after parse), when a room has `box_2d` but no `metadata.approx_area_m2` (or it’s 0), set a derived area: e.g. pixel area `(x_max - x_min) * (y_max - y_min)` converted to m² using a simple scale (e.g. assume total building area from canvas aspect, or a default scale). Store as `area_m2` on the item so calculate and merge get non-zero values and reports don’t show "0 m²" for every room. |
| **D2** | **Merge: prefer extraction area even when analysis path returns zeros** | Already done | We already overwrite analysis items from extraction when `extractionHasAreas && analysisAllZeros`. When using **pythonResults** (calculate path), the merge step already prefers extraction by index; so once extraction items have `area_m2` (from metadata or from D1), merge will use it. |

### Phase E: Image and blob verification

| Step | Action | Owner/File | Notes |
|------|--------|------------|--------|
| **E1** | **Verify image is received before calling vision API** | `lib/ai/orchestrator.ts` | After `privateBlobToDataUrl` (or when using `fileUrl`), check that the image URL is non-empty and, if it’s a data URL, that it has a reasonable length (e.g. > 100 chars). Log a warning or skip extraction if the image appears missing so we don’t send empty context to the model. |
| **E2** | **Optional: log blob fetch failure** | `lib/blob.ts` | In `privateBlobToDataUrl`, on `!res.ok` log the URL (redacted) and status to aid debugging when reports are zero. |

### Phase F: Observability and debugging

| Step | Action | Owner/File | Notes |
|------|--------|------------|--------|
| **F1** | **Log parsed extraction labels once** | `lib/ai/orchestrator.ts` | Right after `raw_extraction = parseExtraction(extractionContent)` (and post-parse name fix), log a single line: e.g. `raw_extraction.items.map(i => i.label)`. This confirms whether names are lost at parse or later (calculate/merge). Remove or gate behind env after debugging. |

---

## 4. Recommended order of implementation

1. **A1** – Always overwrite labels from raw `rooms` by index (biggest impact on "Room" in reports).
2. **B1** – Enforce Gemini for vision extraction (improves coordinate reliability).
3. **B2** – Add few-shot box_2d example to the prompt (reduces axis/format errors).
4. **D1** – Compute area from `box_2d` when `approx_area_m2` is missing (removes all-zero areas when we have boxes).
5. **B3** – Add “describe adjacencies first” to the prompt (improves consistency).
6. **E1** – Verify image before calling vision API (avoids silent empty input).
7. **F1** – Temporary log of parsed labels (to confirm A1 and merge behavior).
8. **A3**, **C2**, **E2** – Optional improvements once the above are in place.

---

## 5. Success criteria

- Report rows show **real room names** (e.g. Garage, Bedroom, Bath) when the extraction response contains them.
- **Bounding boxes** appear on the overlay for runs where extraction returned valid `rooms` + `box_2d` (either from stored `rawExtraction` or from step-trace fallback).
- When the model does not fill `approx_area_m2`, **areas are non-zero** where we can derive them from `box_2d` (with a defined scale).
- **No zero-only reports** when extraction returned valid rooms and the image was available; validation retry is used only when retry passes validation.
- Vision extraction uses **Gemini 2.0 Flash** so coordinate quality is consistent regardless of Admin extraction model choice.
