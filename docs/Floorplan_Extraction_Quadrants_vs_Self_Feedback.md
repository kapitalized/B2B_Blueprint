# Floorplan extraction: quadrants/sections vs look-twice with self-feedback

## Question

Which is better for improving Gemini floorplan extraction?

1. **Sections/quadrants** – Have the model look at the floorplan in sections (e.g. quadrants), then merge.
2. **Look twice with self-feedback** – First pass: extract; second pass: same image + first-pass output, ask the model to review and correct.

---

## Analysis

### Option A: Sections / quadrants

**Idea:** Crop the image into regions (e.g. 4 quadrants or a grid), run extraction per crop, then merge results into one coordinate system.

| Pros | Cons |
|------|------|
| Smaller context per call → model may be more precise per region | Rooms that span boundaries get split or missed; need rules to merge/split |
| Can parallelize quadrant calls | Each crop has its own coordinate system → must map (crop x,y) back to (full canvas x,y) |
| Helps when the full image is too large or dense for one pass | More API calls (e.g. 4× for quadrants); merge/dedupe logic is non-trivial |
| | Labels at crop edges can be cut off or ambiguous |

**Best for:** Very large plans, multi-page or very dense drawings where a single full-image pass consistently misses regions or details. Not needed for typical single-page floorplans.

---

### Option B: Look twice with self-feedback

**Idea:** One initial extraction pass (as now). Then a second vision call with the **same full image** plus the **first-pass JSON**, asking the model to: review against the image, fix overlaps, add missing rooms, correct names.

| Pros | Cons |
|------|------|
| Same image both times → no cropping or coordinate remapping | Two sequential calls → higher latency and cost |
| Model can fix its own mistakes (overlaps, wrong names, missing rooms) | Second pass might occasionally change correct things (can keep first if second fails validation) |
| Fits current pipeline: we already do “retry with validation errors”; this is a structured “second pass” with full output as context | |
| Single schema, single merge point (we already have it) | |
| No new infra (no image cropping, no per-quadrant coordinate math) | |

**Best for:** Typical single-page floorplans where the main issues are validation (overlaps, bounds), missing rooms, or mislabels. Matches the failure modes we see in tests.

---

## Recommendation

**Prefer look-twice with self-feedback** for the current product:

1. **Current failures** are mostly: validation errors (we already retry with error text), occasional wrong/missing names, and sometimes missing rooms. A second pass that sees the full image + its own JSON is well-suited to fix these.
2. **Quadrants** add a lot of complexity (cropping, coordinate mapping, merging, handling boundary rooms) and shine when the main problem is “image too big/dense.” That’s a later optimization if we hit limits on large plans.
3. **We already have** a retry-with-feedback path (validation errors). A “review pass” is a natural extension: same image, richer feedback (full JSON + “review and correct”).

Use **quadrants/sections** only if we later see that single-pass (and two-pass) extraction consistently fails on very large or multi-region plans.

---

## Plan: second-pass review (self-feedback)

### Goal

After the first extraction (and optional validation retry), run a **second vision call** that receives the same image and the first-pass JSON, and outputs a corrected JSON. Use the second-pass result only if it passes validation and is “better” (e.g. more rooms or fewer validation errors).

### Steps

1. **Prompts**
   - Add **EXTRACTION_REVIEW_USER_PROMPT** (and optional system snippet) in `lib/ai/base-prompts.ts`:
     - Input: this floorplan image + the following extraction JSON.
     - Task: Review the image and the JSON. (1) List any rooms in the image that are missing from the JSON. (2) Fix any overlapping or out-of-bounds box_2d. (3) Correct any room names to match the plan labels. (4) Output a single corrected JSON with the same schema (layout_reasoning, canvas_size, rooms with name and box_2d). Return ONLY valid JSON.
   - Keep schema and box_2d rules identical to the first pass so parsing and validation stay the same.

2. **Orchestrator**
   - In `lib/ai/orchestrator.ts`, after the existing extraction + validation retry and `parseExtraction`:
     - If `useVisionPrompt` and we have valid rooms schema and at least one room:
       - Call OpenRouter again with the **same image** and a **user message** containing: the review prompt + the current extraction JSON (e.g. first 4000 chars to stay under context).
       - Parse the response with `extractJson` + `validateFloorplan`.
       - If the review response passes validation:
         - Option A: Always use the review response as the new extraction (replace `extractionContent`).
         - Option B: Use the review response only if it has more rooms or fewer validation errors than the first (to avoid regressions).
       - Append a step trace entry (e.g. “Extraction (review pass)”) with model, prompt preview, response preview, token usage.

3. **Config / feature flag**
   - Add an option (e.g. in model config or env) to enable/disable the review pass (e.g. `ENABLE_EXTRACTION_REVIEW_PASS=true`) so we can test and compare cost/latency/quality.

4. **Testing**
   - Run the Floorplan test with the flag on: compare `floorplan-test-result.json` (and overlay/report) for the same plan with and without the review pass.
   - Check: number of rooms, overlay box count, validation errors, and report labels/values/lengths.

5. **Optional refinements**
   - If the model sometimes “corrects” good boxes: only replace first pass with review when `validateFloorplan(reviewRooms, ...).length === 0` and (e.g.) `reviewRooms.length >= firstPassRooms.length` or review has no overlaps and first pass had overlaps.
   - Cap review to one pass (no review-of-review) to control cost and latency.

### Success criteria

- With the review pass enabled, for the same test plan: same or more rooms, no new validation errors, same or better name/area/length/width in the report.
- No regression when the review pass is disabled (existing behavior unchanged).

---

## Summary

| Approach | Best when | Complexity | Next step |
|----------|-----------|------------|-----------|
| **Quadrants/sections** | Very large or dense plans; single pass misses regions | High (crop, map, merge) | Defer until we hit scale limits |
| **Look twice (self-feedback)** | Typical plans; fix overlaps, missing rooms, wrong names | Low (reuse pipeline + one extra call) | Add optional second-pass review as above |

Implementing the **second-pass review** gives a clear path to better extraction without the overhead of quadrant-based extraction; we can revisit sections later if needed.
