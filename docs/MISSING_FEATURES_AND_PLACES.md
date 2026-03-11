# Missing features and where to implement them

This doc lists **missing features** from the B2B_Blueprint scaffolding and the **places in the repo (and in docs)** where they should be implemented or described.

**Related:** Full rationale and priorities are in **`docs/SCAFFOLDING_REVIEW.md`**. User flow and data model are in **`docs/ConstructionApp_User_Flow_Guide.md`**. Reference library design is in **`docs/Library_Setup.md`**.

---

## 1. Persistence: save pipeline and analyze results to the DB

**What’s missing:** Pipeline (`/api/ai/run`) and `/api/analyze` return results only; nothing is written to `ai_digests`, `ai_analyses`, or `report_generated`.

**Places to implement:**

| What | Where |
|------|--------|
| Insert digest after pipeline run | New helper e.g. `lib/ai/persistence.ts` or inside `app/api/ai/run/route.ts`; call `db.insert(ai_digests)` with `projectId`, `fileId`, `rawExtraction`, `summary`. |
| Insert analysis after pipeline or analyze | Same module or route; `db.insert(ai_analyses)` with `projectId`, `analysisType`, `analysisResult`, `inputSourceIds`. |
| Insert report after synthesis | `db.insert(report_generated)` with `projectId`, `report_title`, `report_type`, `content`, `analysis_source_id`. |
| Require projectId/fileId in APIs | `app/api/ai/run/route.ts` (add `projectId`, optional `fileId` to body); `app/api/analyze/route.ts` (add `projectId`; optionally persist result to `ai_analyses`). |
| Session/user for ownership | Use auth in route (e.g. `getSession()` from Neon Auth); resolve `userId` for `project_main` checks or future `chat_threads`. |

**Related docs:** `docs/SCAFFOLDING_REVIEW.md` §2.1; `docs/ConstructionApp_User_Flow_Guide.md` (Phases 2–5); `lib/db/schema.ts` (table shapes).

---

## 2. Upload + file ingestion (Documents)

**What’s missing:** No API to upload a file to a project (Blob + DB row). Documents page is a placeholder (no real drop zone, list, or “Run analysis”).

**Places to implement:**

| What | Where |
|------|--------|
| Upload API | New route: `app/api/projects/[projectId]/files/route.ts` (POST: multipart or body with URL; call `lib/blob.ts` `put`, then `db.insert(project_files)`). |
| List files for a project | Same route GET or `app/api/projects/[projectId]/files/route.ts` GET; query `project_files` by `projectId`. |
| Documents page: upload UI | `app/(dashboard)/dashboard/ai/documents/page.tsx` – file input or drop zone, call upload API, refresh list. |
| Documents page: file list | Same page – fetch from GET `/api/projects/[projectId]/files`, show name, type, date, blob link. |
| “Run analysis” per file | Same page – button per row that calls `/api/ai/run` (or `/api/analyze`) with `fileUrl` and `projectId`/`fileId`; wire to persistence (see §1). |

**Related docs:** `docs/SCAFFOLDING_REVIEW.md` §2.2; `docs/ConstructionApp_User_Flow_Guide.md` Phase 2; `lib/blob.ts`, `lib/db/schema.ts` (`project_files`).

---

## 3. Vision extraction (images/PDFs) in the pipeline

**What’s missing:** Orchestrator only uses text (`sourceContent`). It does not send `fileUrl` as an image to OpenRouter for extraction.

**Places to implement:**

| What | Where |
|------|--------|
| Vision message when fileUrl is image | `lib/ai/orchestrator.ts` – in the extraction step, if `params.fileUrl` is present, build `content: [{ type: 'text', text: extractionPrompt }, { type: 'image_url', image_url: { url: fileUrl } }]` and pass to `callOpenRouter`. |
| Optional: PDF → image | If supporting PDF: add a step or helper (e.g. render first page to image URL via a serverless tool or external service); pass that URL as `fileUrl`. Document in `docs/` that vision assumes image URL. |

**Related docs:** `docs/SCAFFOLDING_REVIEW.md` §2.3; `lib/ai/openrouter.ts` (OpenRouterMessage already supports `image_url`).

---

## 4. Python + orchestrator integration

**What’s missing:** Orchestrator is LLM-only; Python/in-app engine is only used by `/api/analyze`. No single flow that does both.

**Places to implement / document:**

| What | Where |
|------|--------|
| Option A – Document the split | New or existing doc under `docs/` (e.g. `docs/AI_AND_PYTHON_FLOWS.md`): “Heavy maths → `/api/analyze`; narrative/report → `/api/ai/run`.” Optionally in `docs/SCAFFOLDING_REVIEW.md` or README. |
| Option B – Call Python from orchestrator | `lib/ai/orchestrator.ts` – after extraction, call `callPythonEngine('/calculate', { data: extractionItems, parameters })`; merge results into analysis step input and into `ai_analyses`/report. |

**Related docs:** `docs/SCAFFOLDING_REVIEW.md` §2.4; `lib/ai/orchestrator.ts`; `lib/python-client.ts`; `app/api/analyze/route.ts`.

---

## 5. Reports UI and API

**What’s missing:** Reports page does not load from DB; AIReportViewer is a stub (no markdown, table, or export).

**Places to implement:**

| What | Where |
|------|--------|
| List reports API | New route: `app/api/projects/[projectId]/reports/route.ts` GET – query `report_generated` by `projectId`, return list (id, report_title, report_type, created_at). |
| Single report API | New route: `app/api/reports/[reportId]/route.ts` GET – query `report_generated` by id; optionally join `ai_analyses`; return content, title, type, data_payload if stored. |
| Reports page: fetch list | `app/(dashboard)/dashboard/ai/reports/page.tsx` – fetch from list API, show in sidebar. |
| Reports page: fetch one + viewer | Same page – on select, fetch single report and pass to `AIReportViewer`. |
| AIReportViewer: markdown + table + export | `components/ai/AIReportViewer.tsx` – render `content_md` (e.g. `react-markdown`), render `data_payload` as table, add “Export CSV” using `lib/ai/export.ts`. |

**Related docs:** `docs/SCAFFOLDING_REVIEW.md` §2.5; `lib/ai/export.ts`; `lib/db/schema.ts` (`report_generated`).

---

## 6. Reference library (optional)

**What’s missing:** `ref_*` tables and seeds described in Library_Setup.md are not in the app schema or migrations.

**Places to implement:**

| What | Where |
|------|--------|
| Add ref_* tables to schema | `lib/db/schema.ts` – add tables from `docs/Library_Setup.md` (§3): `ref_materials`, `ref_building_compositions`, `ref_wall_types`, etc. |
| Drizzle migration for ref_* | Run `npx drizzle-kit generate`; new migration in `drizzle/`. |
| Optional seed script | New script e.g. `scripts/seed-reference-library.ts` or in `docs/Library_Setup.md` – baseline materials/compositions. |
| Pipeline library context | Helper that reads from `ref_materials` / `ref_building_compositions`; pass into `libraryContext` in `app/api/ai/run/route.ts` or `lib/ai/orchestrator.ts`. |

**Related docs:** `docs/Library_Setup.md` (full schema and seed examples); `docs/SCAFFOLDING_REVIEW.md` §2.6.

---

## 7. Chat (threads + RAG)

**What’s missing:** Chat page is static; no API for threads/messages or RAG over project data.

**Places to implement:**

| What | Where |
|------|--------|
| Create/list threads API | New route: `app/api/chat/threads/route.ts` – POST create (projectId, title), GET list by user/project; use `chat_threads`. |
| Messages API | New route: `app/api/chat/threads/[threadId]/messages/route.ts` – GET messages for thread; POST user message, run RAG + LLM, append assistant message to `chat_messages`, return response. |
| RAG over project data | In messages POST: query `ai_analyses` (and optionally `ai_knowledge_nodes`) for the thread’s project; build context string and pass to OpenRouter. |
| Chat page UI | `app/(dashboard)/dashboard/ai/chat/page.tsx` – fetch thread list, select thread, fetch messages, input box that POSTs to messages API. |

**Related docs:** `docs/SCAFFOLDING_REVIEW.md` §2.7; `docs/ConstructionApp_User_Flow_Guide.md` Phase 4; `lib/db/schema.ts` (`chat_threads`, `chat_messages`).

---

## 8. Dashboard home and project list

**What’s missing:** Dashboard home is placeholder; no API or UI to list or create projects.

**Places to implement:**

| What | Where |
|------|--------|
| List/create projects API | New route: `app/api/projects/route.ts` – GET list for current user (`project_main` by userId), POST create (projectName, projectAddress); resolve userId from session. |
| Dashboard home: project list | `app/(dashboard)/dashboard/page.tsx` – fetch GET `/api/projects`, show cards/table; “New project” button → POST then redirect or refresh. |
| Links to project-scoped views | Dashboard or nav – link to Documents/Reports with `?projectId=` or dynamic segment `dashboard/[projectId]/...` if you add it. |

**Related docs:** `docs/SCAFFOLDING_REVIEW.md` §2.8; `lib/db/schema.ts` (`project_main`).

---

## 9. Plan limits (free vs paid)

**What’s missing:** No enforcement of “free = 1 project, 5 files” or feature gating by plan.

**Places to implement:**

| What | Where |
|------|--------|
| Check project count before create | In `app/api/projects/route.ts` POST – if `user_profiles.plan_type === 'free'`, count existing projects for user; reject if ≥ 1. |
| Check file count before upload | In upload route – count `project_files` for user or project; reject if free and at limit (e.g. 5). |
| Feature gating (e.g. report gen) | In relevant API routes or middleware – read `user_profiles.plan_type`; allow “advanced” analysis/report only for basic/premium. |

**Related docs:** `docs/ConstructionApp_User_Flow_Guide.md` §2 (User types); `docs/SCAFFOLDING_REVIEW.md` §2.9; `lib/db/schema.ts` (`user_profiles.plan_type`).

---

## 10. Run history and audit trail persistence

**What’s missing:** Audit trail and run history are in-memory only; no DB tables for runs or audit log.

**Places to implement:**

| What | Where |
|------|--------|
| Optional: pipeline_runs table | `lib/db/schema.ts` – add table (taskId, runId, status, projectId, fileId, userId, timestamps); new Drizzle migration. |
| Write run on pipeline completion | In `app/api/ai/run/route.ts` or after `runPipeline` – insert into `pipeline_runs` (or store minimal run id in `ai_digests`/`ai_analyses`). |
| Optional: audit_log table | `lib/db/schema.ts` – add table; replace in-memory append in `lib/ai/audit-trail.ts` with DB insert. |

**Related docs:** `docs/SCAFFOLDING_REVIEW.md` §2.10; `lib/ai/audit-trail.ts`; `lib/ai/run-history.ts`.

---

## Quick reference: docs that describe each area

| Topic | Doc |
|-------|-----|
| Full gap list and priorities | `docs/SCAFFOLDING_REVIEW.md` |
| User flow, phases, data I/O | `docs/ConstructionApp_User_Flow_Guide.md` |
| Reference library schema and seed | `docs/Library_Setup.md` |
| Initial schema (reference) | `docs/initial_schema11Mar26.ts` |
| Deploy (Vercel, env) | `docs/VERCEL_DEPLOY_STEPS.md` |
| DB (Neon) | `docs/NEON_SETUP.md` |
| Payload admin | `docs/PAYLOAD_ADMIN.md` |
| This file (missing features + places) | `docs/MISSING_FEATURES_AND_PLACES.md` |
