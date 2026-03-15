# Floorplan Extraction & Report Workflow — Fix List

Use this list to fix (1) no boundary box on overlay, (2) image analysis uncertainty, and (3) report always showing "Room" and nil/0 for every label. Run the **Floorplan Test** page with the same plan to verify each fix; results are written to `docs/Testing/floorplan-test-result.json` so Cursor can inspect them.

---

## Implementation status (quick reference)

| Item | Status | Notes |
|------|--------|--------|
| **Prompt: EXTRACTION_VISION_USER_PROMPT for 0–1000 coords** | **Not done** | Prompt currently asks for **image pixels** + `canvas_size` (e.g. "Measure in image pixels", "box_2d in image pixels"). It does **not** request 0–1000 normalized coords as the primary format; only mentions "legacy" detections with bbox in 0–1000. Parser and overlay already support both (pixels + canvas → scaled to 0–1000). To "update for 0–1000 coords" you could change the prompt to ask for normalized 0–1000 explicitly. |
| **Validation: Wire validateFloorplan into orchestrator** | **Done** | `validateFloorplan` is imported and used in `lib/ai/orchestrator.ts`: after first extraction, if response is rooms schema we run `validateFloorplan(rooms, w, h)`; on errors we retry once with a correction prompt and use retry content only if it passes validation. |
| **Persistence: persistPipelineResult saves raw extraction to Neon** | **Done** | `persistPipelineResult` writes `result.raw_extraction` to both `ai_digests.rawExtraction` and `ai_analyses.rawExtraction` (parsed structure: items with coordinate_polygons, labels, etc.). The **literal raw JSON string** from Gemini is now also captured as `rawExtractionResponse` on the pipeline result and written by the test route to `docs/Testing/floorplan-test-result-extraction-raw.json`. |

---

## 1. No boundary box drawn on floorplan

| # | Item | Where | What to do |
|---|------|--------|------------|
| 1.1 | **Persist extraction so overlay has boxes** | `lib/ai/persistence.ts`, overlay API | Stored `rawExtraction` must have either (a) `items[].coordinate_polygons` (normalized 0–1000 bbox), or (b) `rooms` + `canvas_size` so overlay can build boxes. Today we persist `result.raw_extraction` (from `mapRoomsToItems`) which sets `coordinate_polygons` on each item. Verify that after persist/load the overlay receives this shape and that `extractOverlayItems(raw)` finds bbox (e.g. log `raw?.items?.[0]` in overlay route when `items.length === 0`). |
| 1.2 | **Overlay: prefer items then rooms then step-trace** | `app/api/reports/[reportId]/overlay/route.ts` | `extractOverlayItems` already tries (1) `raw.items` + `getBbox(item)` (coordinate_polygons/bbox), (2) `raw.rooms` + `raw.canvas_size` (box_2d → 0–1000), (3) detections. Then fallback: parse extraction step `responsePreview` from stepTrace. Ensure step trace stores enough of the extraction response (e.g. full JSON, not truncated) so fallback can parse `rooms` + `box_2d` + `canvas_size`. If truncation is the issue, increase `responsePreview` length in orchestrator when pushing the EXTRACTION step. |
| 1.3 | **Parsed extraction must produce coordinate_polygons** | `lib/ai/orchestrator.ts` | In `mapRoomsToItems`, we set `coordinate_polygons: bbox`. Confirm that the extraction response is parsed as rooms schema (check `canvas_size` / `canvasSize` and `box_2d` / `box2d` / `bbox` on first room). If the model returns different keys (e.g. `canvasSize`, `boundingBox`), extend `parseExtraction` / `mapRoomsToItems` to accept them so we always produce items with `coordinate_polygons`. |
| 1.4 | **PlanOverlayViewer receives items** | `components/ai/PlanOverlayViewer.tsx` | Viewer only draws when `items.length > 0` and each item has `bbox` [ymin, xmin, ymax, xmax]. If overlay API returns `items: []`, the UI shows "No detection boxes". So fix is upstream: ensure overlay API returns non-empty items (via 1.1–1.3). |

---

## 2. Image analysis (extraction) — verify it runs and is used

| # | Item | Where | What to do |
|---|------|--------|------------|
| 2.1 | **Vision path is used** | `app/api/ai/run/route.ts`, client | Pipeline uses vision only when `params.fileUrl` is set. Client must send `fileUrl: file.blobUrl` (already in `AIDocumentsContent.tsx`). In run route, if only `fileId` is sent, resolve `fileId` → `blobUrl` and pass as `fileUrl` so vision extraction always runs when a file is selected. |
| 2.2 | **Image URL valid before vision call** | `lib/ai/orchestrator.ts` | We already clear image when data URL length < 500 or blob fetch fails. Add a short log when vision is skipped (e.g. "Vision skipped: no image URL") so test runs show whether the image was actually sent. |
| 2.3 | **Extraction model** | `lib/ai/openrouter-models.ts` | Vision extraction should use Gemini 2.0 Flash (`getExtractionModelForVision`). Confirm it is used for vision calls and that the extraction step trace shows this model. |
| 2.4 | **Analysis step receives extraction** | `lib/ai/orchestrator.ts` | Analysis prompt includes `raw_extraction` (with labels and areas). Ensure we do not pass a stub when vision succeeded; only use stub on OpenRouter error. Check that when extraction returns real room names and areas, analysis prompt contains them. |

---

## 3. Report shows "Room" and nil / 0 for every label

| # | Item | Where | What to do |
|---|------|--------|------------|
| 3.1 | **Labels from raw rooms by index** | `lib/ai/orchestrator.ts` | After `parseExtraction`, we overwrite `raw_extraction.items[i].label` from raw `rooms[i].name` (and Name/room_name/label). Ensure this runs when `useVisionPrompt && raw_extraction.items.length > 0` and that we re-parse the same `extractionContent` (not a truncated or different string). If the model returns names under a different key (e.g. `room_name`), include it in the fallback chain. |
| 3.2 | **Merge prefers extraction label and area** | `lib/ai/orchestrator.ts` | Normalized report items are built from analysis then merged with extraction by index and by id/citation_id. Prefer extraction label when different and extraction area when > 0. Confirm `extractionRooms` is set when we have vision and extraction so that `extLabel` in the merge uses the real name. |
| 3.3 | **Area from box_2d when metadata missing** | `lib/ai/orchestrator.ts` | In `mapRoomsToItems`, when `metadata.approx_area_m2` is missing or 0, we already derive area from `box_2d` (pixel area → proportion of canvas × 150 m²). Verify this runs and that `raw_extraction.items` have non-zero `area_m2` where boxes exist, so analysis/merge and report get non-zero values. |
| 3.4 | **Synthesis never sees null/nil** | `lib/ai/orchestrator.ts`, `lib/ai/base-prompts.ts` | Normalized items use `value: Number(i.value ?? 0)` and `label: String(i.label ?? '')`. Synthesis prompt says "never write nil". If the report still shows "nil", the model may be inventing it; tighten synthesis system prompt to "Never output the word nil or null in the table; use 0 or — for missing numbers." |
| 3.5 | **Analysis fallback when all zeros** | `lib/ai/orchestrator.ts` | When analysis returns all zeros but extraction has `area_m2`, we replace analysis items with extraction-based items. Ensure this path runs (extraction has areas from 3.3) and that labels come from extraction (3.1). |

---

## 4. Automated test and observability

| # | Item | Where | What to do |
|---|------|--------|------------|
| 4.1 | **Floorplan test page** | `app/(dashboard)/dashboard/ai/floorplan-test/page.tsx` | Use the test page: pick project + file, run test. Result is written to `docs/Testing/floorplan-test-result.json` and shown in the UI. Cursor can read that file to see extraction labels, overlay item count, report payload, and step trace. |
| 4.2 | **Test result file contents** | `docs/Testing/floorplan-test-result.json` | Contains: `extractionLabels`, `overlayItemsCount`, `reportPayloadLabels`, `reportPayloadValues`, `stepTrace` (step names + model), `errors`. Use this to confirm after each fix: boxes appear (overlayItemsCount > 0), labels are real names, values are non-zero where expected. |
| 4.3 | **Optional: unit test with fixture** | e.g. `lib/ai/orchestrator.test.ts` or `__tests__/floorplan-workflow.test.ts` | Run `runPipeline` with a mock extraction response (rooms + box_2d + canvas_size) and assert: `raw_extraction.items` have labels and coordinate_polygons; merge produces non-zero values and real labels; no "Room" when fixture has real names. |

---

## Recommended order

1. **2.1** — Ensure `fileUrl` is always set when running from a file (resolve from `fileId` in run route if needed).
2. **1.3** — Ensure parsing accepts model’s schema so items get `coordinate_polygons`.
3. **3.1** + **3.2** — Confirm label overwrite and merge use extraction names.
4. **3.3** — Confirm area-from-box_2d so report has non-zero areas.
5. **1.2** — If overlay still empty, ensure step-trace fallback has full extraction JSON.
6. **4.1 / 4.2** — Run test page after each change and inspect `floorplan-test-result.json`.

---

## Success criteria

- **Overlay:** At least one bounding box is drawn when extraction returned valid rooms with `box_2d`.
- **Report:** Row labels match extraction names (e.g. Garage, Bedroom, Bath), not all "Room".
- **Report:** No "nil"; numeric cells show numbers (or 0/—).
- **Report:** Areas are non-zero when extraction has boxes (or metadata.approx_area_m2).
- **Test:** Same plan run via test page produces a result file that Cursor can read and that reflects the above.
