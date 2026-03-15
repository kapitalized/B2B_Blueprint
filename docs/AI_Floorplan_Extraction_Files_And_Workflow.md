# AI and floorplan extraction: files and workflow

## Files that contain AI / floorplan extraction logic

| File | What it does |
|------|----------------|
| **lib/ai/base-prompts.ts** | Defines the **vision extraction prompt** (`EXTRACTION_VISION_USER_PROMPT`, `EXTRACTION_VISION_SYSTEM`): instructs the model to return rooms with `name`, `box_2d` [x_min, y_min, x_max, y_max], `canvas_size`; **plan-first** (describe adjacencies before coordinates); system prompt includes **few-shot example** and strict rule x_min&lt;x_max, y_min&lt;y_max. Also holds system prompts for ANALYSIS and SYNTHESIS. |
| **lib/ai/orchestrator.ts** | **Pipeline controller**: resolves image (private blob → data URL; **verifies** image present / not too short); **vision extraction always uses Gemini 2.0 Flash**; extraction → validation → optional retry (only if retry passes validation) → parse → **always overwrite labels from raw rooms by index** → **area from box_2d when metadata has no approx_area_m2** → calculate/analysis → merge → synthesis. Optional `DEBUG_AI_EXTRACTION` log of parsed labels. |
| **lib/ai/validate-floorplan.ts** | **Validation** for rooms schema: checks coordinate validity (x1&lt;x2, y1&lt;y2), bounds (box inside canvas), and overlaps (&gt;1% overlap). Returns list of error strings; used to decide whether to retry extraction and whether to accept the retry response. |
| **lib/ai/openrouter.ts** | **LLM client**: calls OpenRouter chat completions, returns content + usage (tokens, cost) and optional reasoning. Used by orchestrator for extraction, analysis, and synthesis. |
| **lib/ai/openrouter-models.ts** | **Model list and vision handling**: list of OpenRouter model ids/labels and `vision` flag; `getExtractionModelForVision(configuredModel)` picks the extraction model (uses default vision model if configured one doesn’t support images). |
| **lib/ai/model-config.ts** | **Admin model config**: reads/writes `ai_model_config` (extraction, analysis, synthesis, chat). `getAIModelConfig()` used by API and orchestrator to get which models to use. |
| **lib/ai/bbox-utils.ts** | **Bbox helpers for drawing**: `scaleCoordinate(val, dimension)`, `bboxToRect(bbox, imgWidth, imgHeight)` to convert normalized 0–1000 bbox to canvas pixel rect. Used when drawing overlays. |
| **lib/ai/persistence.ts** | **Save pipeline result**: writes `raw_extraction`, analysis payload, step trace, token usage to `ai_digests` and `ai_analyses`, creates `report_generated` row and returns report id/shortId. |
| **lib/ai/citation-audit.ts** | **Citation/audit**: runs citation audit on analysis items and produces critical warnings; used before synthesis. |
| **lib/ai/templates.ts** | **Prompt overrides**: template-based overrides for extraction/analysis/synthesis text (e.g. takeoff template). |
| **app/api/ai/run/route.ts** | **API entry**: POST handler. Loads project/file, library context, calls `runPipeline()`, then `persistPipelineResult()`, writes run log, optionally indexes to knowledge nodes, returns result + reportId. |
| **app/api/reports/[reportId]/overlay/route.ts** | **Overlay data API**: GET. Loads report → analysis → `rawExtraction` and file image URL. Builds overlay items from `rawExtraction` (items[] with coordinate_polygons, or rooms+box_2d+canvas_size, or detections); if no boxes, parses extraction step’s `responsePreview` from step trace (supports rooms schema). Returns `{ imageUrl, items }` for the plan overlay. |
| **components/ai/PlanOverlayViewer.tsx** | **Overlay UI**: draws bounding boxes (0–1000 coords) over the floorplan image, with labels; supports download of image with boxes. |
| **components/ai/AIReportViewer.tsx** | **Report UI**: shows report markdown, data payload, pipeline step trace, and “Copy JSON” (pipeline + report). |

Supporting / reference (no extraction logic, but in the flow):

- **lib/ai/logs.ts** – Writes run/report logs.
- **lib/ai/library-context.ts** – Loads library context for pipeline.
- **lib/ai/knowledge-nodes.ts** – Indexes digest/report text.
- **lib/calculate-engine.ts** – In-app /calculate (area × thickness) when no Python engine.
- **lib/python-client.ts** – Calls Python engine or in-app calculate.

---

## Workflow (steps)

1. **Trigger**  
   - User (or UI) sends POST to `/api/ai/run` with `projectId`, `fileId`/`fileUrl`, optional `sourceContent`, `libraryContext`, `templateId`, etc.

2. **API setup**  
   - Auth, rate limit, load project/file, library context, report title, `getAIModelConfig()` (extraction, analysis, synthesis models).

3. **Image resolution and verification (orchestrator)**  
   - If `fileUrl` present: resolve image (private blob → data URL via `privateBlobToDataUrl`; on failure log warning and clear image). If result is a data URL with length &lt; 500, treat as missing and clear image.  
   - Ensures the vision API is not called with a broken or empty image.

4. **Extraction (orchestrator)**  
   - If image URL available: use vision prompt (`EXTRACTION_VISION_USER_PROMPT` + `EXTRACTION_VISION_SYSTEM`). **Extraction model is always Gemini 2.0 Flash** for vision (`getExtractionModelForVision()` ignores Admin setting). Call OpenRouter with image + prompt.  
   - Else: use text extraction prompt and `sourceContent`.  
   - Response is a single JSON string (rooms + canvas_size + box_2d, or legacy detections + bbox).

5. **Validation and optional retry**  
   - Parse JSON (`extractJson` + JSON.parse). If schema is rooms + box_2d + canvas_size, run `validateFloorplan(rooms, width, height)`.  
   - If errors: one retry with correction prompt (errors + previous JSON). Use retry content **only if** retry response passes validation; otherwise keep first response.  
   - Push step trace (and retry trace if applicable).

6. **Parse extraction**  
   - `parseExtraction(extractionContent)` → `ExtractionResult` (items with id, label, confidence_score, coordinate_polygons, area_m2, length_m, width_m).  
   - **Rooms schema**: `mapRoomsToItems(parsed)` — box_2d pixel → normalized 0–1000 [ymin, xmin, ymax, xmax]; names from `name`/Name/room_name/label; **if metadata has no approx_area_m2, area_m2 is derived from box_2d** (proportional to canvas, assumed total ~150 m²).  
   - **Legacy**: `mapDetectionsToItems(parsed)` (bbox/detections/regions/objects).  
   - **Always overwrite labels from raw rooms**: re-parse `extractionContent` and set `raw_extraction.items[i].label` from `rooms[i].name` (or Name/room_name/label) by index so the report never loses extraction names.  
   - If `DEBUG_AI_EXTRACTION` is set, log parsed labels.

7. **Calculate (optional)**  
   - If `fileUrl` and items.length &gt; 0: send items (id, label, area) to Python engine `/calculate` (or in-app `runCalculate`). Get back results with area_m2, volume_m3.

8. **Analysis**  
   - If calculate results exist: turn them into analysis items (id, label, value, unit, citation_id).  
   - Else: call analysis model with extraction JSON + library constants; parse analysis JSON into items. If analysis is all zeros but extraction has area_m2, replace analysis items with extraction-based items.

9. **Merge extraction into report items**  
   - Normalize analysis items (value, label, unit).  
   - For each item, by index (and by id/citation_id): prefer extraction label when different, prefer extraction area_m2/length_m/width_m when &gt; 0. Report never drops real names/areas when extraction has them.

10. **Citation audit**  
    - `runCitationAudit(normalizedItems, benchmarks)` → critical warnings.

11. **Synthesis**  
    - Build synthesis prompt with normalized items and optional critical warnings. Call synthesis model; get markdown report.

12. **Persist**  
    - `persistPipelineResult()`: insert `ai_digests` (rawExtraction, summary), `ai_analyses` (analysisResult, rawExtraction, stepTrace, tokenUsage, modelsUsed, inputSourceIds), `report_generated` (content, analysisSourceId, shortId).

13. **Logging and indexing**  
    - Write report log, AI run log (tokens, cost). Optionally index synthesis + raw extraction to knowledge nodes.

14. **Response**  
    - Return pipeline result + reportId, reportShortId, run metadata, token usage.

15. **Overlay (when user opens report)**  
    - GET `/api/reports/[reportId]/overlay`: load report → analysis → rawExtraction; build overlay items from items[].coordinate_polygons or rooms+box_2d+canvas_size or detections; if none, parse extraction step’s responsePreview from step trace (rooms schema). Return imageUrl + items.  
    - **PlanOverlayViewer** fetches that and draws boxes (0–1000 → pixel rect) on the plan image.

---

## Summary

- **Prompts**: `base-prompts.ts`.  
- **Run pipeline**: `orchestrator.ts` (extraction → validate/retry → parse → calculate/analysis → merge → synthesis).  
- **Validation**: `validate-floorplan.ts`.  
- **LLM**: `openrouter.ts`; model choice: `openrouter-models.ts`, `model-config.ts`.  
- **Persistence**: `persistence.ts`.  
- **Entry**: `app/api/ai/run/route.ts`.  
- **Overlay data**: `app/api/reports/[reportId]/overlay/route.ts`; overlay UI: `PlanOverlayViewer.tsx`.  
- **Report UI**: `AIReportViewer.tsx`.

**Recent workflow changes (action plan):** Vision extraction always uses Gemini 2.0 Flash (`getExtractionModelForVision` ignores Admin for step 1). Image is verified (blob fetch; data URL length) before calling the vision API. Labels are always overwritten from raw `rooms` by index after parse. Area is derived from `box_2d` when metadata has no `approx_area_m2`. Prompts: plan-first (describe adjacencies), few-shot box_2d example, strict x_min&lt;x_max. Set `DEBUG_AI_EXTRACTION` to log parsed labels.
