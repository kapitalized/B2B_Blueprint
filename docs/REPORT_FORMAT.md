# Report format

Reports produced by the AI pipeline follow a **set structure** defined by the synthesis step and templates.

## Standard structure (takeoff / floorplan)

For the **Floorplan / quantity takeoff** template (default when you run analysis on an uploaded image):

1. **Title** – Short report title (e.g. "Quantity takeoff report").
2. **Summary** – One or two sentences describing what was analysed.
3. **Table** – Markdown table of items with columns: **Label**, **Value**, **Unit**.
4. **CRITICAL WARNING** (optional) – Section added only when the citation audit finds deviations; lists warnings.

The content is stored as **Markdown** in `report_generated.content` and rendered in the Reports UI (e.g. with React Markdown). The underlying data is also stored in `ai_analyses.analysis_result` as structured JSON (`items` array) for tables and export.

## Other templates

- **Financial memo** – Executive summary + table of key figures.
- **Generic** – No fixed structure; the model formats extraction/analysis as it sees fit.

Templates are defined in `lib/ai/templates.ts`; the synthesis system prompt is in `lib/ai/base-prompts.ts` (SYNTHESIS).

## Report types

- `quantity_takeoff` – Default for floorplan takeoff.
- `defect_audit` – For defect/audit-style reports when that template is used.

Report type and title are set in `lib/ai/persistence.ts` when persisting the pipeline result (and can be overridden via the API).
