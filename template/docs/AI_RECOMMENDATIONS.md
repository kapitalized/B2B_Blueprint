# AI Analysis — Recommendations for Complex Docs & Financials

Suggestions to make the AI module production-ready for technical and financial documents.

## Already in the blueprint
- **Citation audit** (`lib/ai/citation-audit.ts`) — flags >15% deviation vs benchmarks.
- **3-step pipeline** — EXTRACT → ANALYZE → SYNTHESIZE; optional review step.
- **Report viewer** — placeholder with export hook; wire to blueprint AIReportViewer.

## Module structure (8 recommendations wired in)

| # | Recommendation | Lib / API | Notes |
|---|----------------|-----------|--------|
| 1 | **Source-first view** + click-to-cite | `lib/ai/types.ts` → `SourceSpan`; extraction items have `source_span?` in `orchestrator.ts` | UI: Chat/Reports panels use `SourceSpan` to highlight region in source doc. |
| 2 | **Review queue** | `lib/ai/review-queue.ts`, `GET /api/ai/review-queue` | `isNeedsReview()`, `filterNeedsReview()`; use `ReviewResultsDrawer` + `AITaskStatus` on Reports page. |
| 3 | **Version / run history** | `lib/ai/run-history.ts`, `GET /api/ai/run-history?documentId=` | `appendRunHistory()`, `getRunHistory(documentId)`; stub storage → Supabase when ready. |
| 4 | **Export** | `lib/ai/export.ts` | `exportToCSV()`, `downloadCSV()`, `exportToExcel()` stub, `exportToPDF()` stub. Use in AIReportViewer. |
| 5 | **Multi-file & batch** | `lib/ai/batch.ts`, `POST /api/ai/batch` | `runBatchPipeline(inputs, options)`; uses templates and appends to run history. |
| 6 | **Audit trail** | `lib/ai/audit-trail.ts` | `createAuditEntry()`, `appendAuditEntry()`, `getAuditLog()`; orchestrator logs each step (model, promptVersion, timestamp). Persist to DB when ready. |
| 7 | **Templates** | `lib/ai/templates.ts`, `GET /api/ai/templates` | `getTemplate(id)`, `listTemplates()`, `getPromptOverrides(id)`; orchestrator accepts `templateId` and applies prompt overrides. |
| 8 | **Confidence & grounding** | `lib/ai/types.ts` → `FindingWithGrounding`, `SourceSpan`; `orchestrator` extraction items have `confidence_score` + `source_span?` | Surface in UI per finding. |

**Orchestrator** (`lib/ai/orchestrator.ts`): accepts `runId`, `documentId`, `templateId`; writes audit entries per step; returns `runId` in `PipelineResult`; extraction items support `source_span` for click-to-cite.

**Exports:** All of the above are re-exported from `lib/ai/index.ts`.

Implement UI in this order: review queue + audit trail → source-first view + click-to-cite → export → batch → templates.
