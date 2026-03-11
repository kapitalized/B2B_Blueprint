# Template scaffolding review: AI + Python + reporting

Review of what exists vs what’s needed to complete the B2B_Blueprint as scaffolding for an app that uses **AI (multi-step ingestion/analysis)**, **Python for maths**, and **reporting**.

---

## 1. What’s already in place

| Area | Status | Notes |
|------|--------|------|
| **DB schema (Drizzle)** | ✅ | `user_profiles`, `project_main`, `project_files`, `ai_digests`, `ai_analyses`, `ai_knowledge_nodes`, `chat_threads`, `chat_messages`, `report_generated`. Migration `drizzle/0000_construction_initial.sql` exists. |
| **DB client** | ✅ | `lib/db/index.ts` – Neon serverless + Drizzle, uses `DATABASE_URL`. |
| **AI pipeline (orchestrator)** | ✅ | 3 steps: EXTRACT → ANALYZE → SYNTHESIZE; citation audit; stub when no OpenRouter key. `lib/ai/orchestrator.ts`. |
| **OpenRouter** | ✅ | `lib/ai/openrouter.ts` – supports text + `image_url` in messages. Key from env. |
| **Python / maths** | ✅ | In-app `lib/calculate-engine.ts` when `PYTHON_ENGINE_URL` unset; optional external FastAPI. `/api/analyze` calls it. |
| **Blob storage** | ✅ | `lib/blob.ts` – Vercel Blob put/list/del. `lib/storage.ts` wraps list. |
| **AI run API** | ✅ | `POST /api/ai/run` – runs pipeline with `orgId`, `sourceContent`, `libraryContext`, `benchmarks`. Returns result in memory only. |
| **Batch pipeline** | ✅ | `lib/ai/batch.ts` – runs pipeline per document; appends to in-memory run history only. |
| **Templates / review queue** | ✅ | `lib/ai/templates.ts`, `lib/ai/review-queue.ts`, `lib/ai/run-history.ts` – structure present; persistence is in-memory/stub. |
| **Export helpers** | ✅ | `lib/ai/export.ts` – CSV real; Excel/PDF stubs. |
| **Dashboard shell** | ✅ | Dashboard, AI (Documents, Reports, Chat) – layout and nav; content mostly placeholders. |
| **Auth** | ✅ | Neon Auth or Supabase; middleware protects `/dashboard`. |
| **Payload CMS** | ✅ | Admin, Pages, Site Settings, seed; marketing site uses CMS. |

---

## 2. Gaps to complete the scaffolding

### 2.1 Persistence: wire pipeline and analyze to the DB

- **Pipeline results are not saved.**  
  `POST /api/ai/run` and `runBatchPipeline` return results only; nothing is written to `ai_digests`, `ai_analyses`, or `report_generated`.
- **`/api/analyze` does not persist.**  
  Python/in-app calculate results are returned but not stored in `ai_analyses`.

**Needed:**

- After a successful pipeline run (and optionally after `/api/analyze`):
  - Insert **digest** → `ai_digests` (raw extraction + summary).
  - Insert **analysis** → `ai_analyses` (analysis result + input source ids).
  - Insert **report** → `report_generated` (content_md / content, link to analysis).
- Require **projectId** (and optionally **fileId**) in the run/analyze APIs so rows can be linked to `project_main` / `project_files`. Use **userId** from session for `user_profiles` / `chat_threads` where applicable.

### 2.2 Upload + file ingestion (Documents)

- **Documents page is placeholder.**  
  “Drop files or click to upload” is not wired; no project/file creation, no Blob upload, no “Run analysis” per file.
- **No API for “upload file to project”.**  
  Need a route that: accepts multipart (or URL); uploads to Vercel Blob; creates/updates `project_files` (and ensures `project_main` exists); returns `fileId`, `blobUrl`, etc.

**Needed:**

- **API:** e.g. `POST /api/projects/[projectId]/files` (or `/api/upload`) that:
  - Uses `lib/blob.ts` to store the file.
  - Inserts into `project_files` with `projectId`, `blobUrl`, `blobKey`, `file_name`, `file_type`, `file_size`.
- **UI:** Documents page:
  - Project selector or default project.
  - Real file drop/select → call upload API.
  - List of uploaded files from DB (and optionally from Blob list).
  - “Run analysis” per file → call pipeline (or analyze) with `fileUrl`/content and persist (see 2.1).

### 2.3 Vision extraction (images/PDFs) in the pipeline

- **Orchestrator only uses text.**  
  It uses `sourceContent` in the extraction prompt. It does not send `fileUrl` as an image to OpenRouter, even though `OpenRouterMessage` supports `image_url`.
- **No “fetch file and pass as image” step.**  
  For floorplans/PDFs you need either: image URL in the vision API, or a separate step (e.g. PDF → image, then vision).

**Needed:**

- In `runPipeline`, when `fileUrl` is present and points to an image (or a rendered PDF page):
  - Build a vision message (e.g. `content: [{ type: 'text', text: extractionPrompt }, { type: 'image_url', image_url: { url: fileUrl } }]`) and use it for the extraction step.
- Optionally: support PDF (e.g. first page as image, or use a tool to convert PDF → image and pass that URL). Document that the scaffolding assumes “image URL” for vision.

### 2.4 Python + orchestrator integration (optional but recommended)

- **Orchestrator does not call Python.**  
  All analysis is LLM-only. The “Python for maths” path is only used by `/api/analyze` (separate flow).
- **Two parallel flows:**  
  (1) Pipeline: extract → analyze (LLM) → synthesize.  
  (2) Analyze API: direct call to Python/in-app calculate.

**Needed (choose one or both):**

- **Option A – Keep separate:**  
  Document clearly: “Heavy maths (areas, volumes, takeoffs) → use `/api/analyze` (Python/in-app engine). High-level reasoning and report text → use pipeline (`/api/ai/run`).” Optionally have the Documents “Run analysis” button call both and merge (e.g. pipeline for digest + narrative, analyze for numbers; then persist both).
- **Option B – Integrate:**  
  In the orchestrator, after extraction, call the in-app Python engine (or `callPythonEngine`) with extraction items to get areas/volumes; then pass those results into the synthesis step and into `ai_analyses`/report.

### 2.5 Reports UI and API

- **Reports page does not load from DB.**  
  It shows a static “Sample report” and “No reports yet”. No fetch of `report_generated`.
- **AIReportViewer is a stub.**  
  It doesn’t render markdown, tables, or export; blueprint text says “Replace with full AIReportViewer”.

**Needed:**

- **API:** e.g. `GET /api/projects/[projectId]/reports` (list) and `GET /api/reports/[reportId]` (single). Read from `report_generated` (and optionally join `ai_analyses`). Return `content`, `report_title`, `report_type`, `created_at`, etc.
- **UI:** Reports page:
  - Load report list from API; show in sidebar.
  - On select, load one report and pass to viewer.
- **AIReportViewer:** Render `content_md` (e.g. React Markdown), show `data_payload` as a table, and add “Export CSV” (and later Excel/PDF) using `lib/ai/export.ts`.

### 2.6 Reference library (optional for v1)

- **Library_Setup.md** describes `ref_materials`, `ref_building_compositions`, `ref_wall_types`, etc., and pgvector for `ref_knowledge_nodes`.
- **None of this is in the app schema.**  
  `lib/db/schema.ts` has no `ref_*` tables; no migration, no seed.

**Needed (if you want “AI + library” in the scaffold):**

- Add `ref_*` tables to `lib/db/schema.ts` (as in Library_Setup.md), add a Drizzle migration, run it.
- Optional: seed script for baseline materials/compositions.
- In the pipeline, pass a **library context** (e.g. from `ref_materials` / `ref_building_compositions`) into `libraryContext` so the analysis step can use it. Can stay minimal (e.g. one table + a single “get constants for project type” helper).

### 2.7 Chat (threads + RAG)

- **Chat page is static.**  
  No create thread, send message, or load history.
- **No chat API.**  
  No persistence to `chat_threads` / `chat_messages`; no RAG over `ai_analyses` or `ai_knowledge_nodes`.

**Needed:**

- **API:** e.g. `POST /api/chat/threads` (create), `GET /api/chat/threads` (list), `POST /api/chat/threads/[threadId]/messages` (send user message, run RAG + LLM, append assistant message, return stream or full response). Store in `chat_threads` and `chat_messages`.
- **RAG:** For each user message, query `ai_analyses` (and optionally `ai_knowledge_nodes` if you add vector search) for the current project; inject into the LLM context.
- **UI:** Wire Chat page to these APIs (thread list, message list, input, loading state).

### 2.8 Dashboard home and project list

- **Dashboard home is placeholder.**  
  “Reports and AI tasks will appear here” only.
- **No project list or “create project” flow.**  
  Schema has `project_main` but no API or UI to list/create projects.

**Needed:**

- **API:** e.g. `GET /api/projects` (list for user), `POST /api/projects` (create). Use session to resolve `userId` and filter/create `project_main`.
- **UI:** Dashboard home: list projects (name, address, status); “New project” button; links to project-scoped Documents/Reports (or single default project for minimal scaffold).

### 2.9 Plan limits (free vs paid)

- **User flow doc** says free = 1 project, 5 files; Basic/Premium = multi-project, advanced analysis, reports.
- **No enforcement in code.**  
  No checks on `user_profiles.plan_type` or counts.

**Needed (when moving to pre-production):**

- Middleware or API helpers: before create project → check project count; before upload → check file count per project/user; before “advanced” analysis/report → check plan. Use `user_profiles.plan_type` and Stripe when billing is wired.

### 2.10 Run history and audit trail persistence

- **Audit trail and run history are in-memory/stub.**  
  `lib/ai/audit-trail.ts` and run-history append to memory only.
- **No tables for “run” or “audit” in the current schema.**  
  You could add `pipeline_runs` and `audit_log` later, or reuse existing tables (e.g. store run id in `ai_digests`/`ai_analyses`).

**Needed (for production-grade scaffold):**

- Either add `pipeline_runs` (taskId, runId, status, projectId, fileId, timestamps) and write to it from the pipeline, or store minimal run metadata in existing analysis/report rows.
- Optionally add an `audit_log` table and replace the in-memory audit with DB inserts.

---

## 3. Suggested order of work

1. **Persistence (2.1)** – Save pipeline and (optionally) analyze results to `ai_digests`, `ai_analyses`, `report_generated` so the rest of the app can rely on real data.
2. **Upload + Documents (2.2)** – Upload API + Documents page with list and “Run analysis” so users can add files and trigger the pipeline.
3. **Reports API + viewer (2.5)** – List/fetch reports from DB and a real AIReportViewer (markdown + table + CSV export).
4. **Vision (2.3)** – Pass `fileUrl` as image into the extraction step when applicable.
5. **Python in pipeline (2.4)** – Either document the split (Option A) or integrate Python into the orchestrator (Option B).
6. **Projects API + dashboard home (2.8)** – List/create projects and show them on the dashboard.
7. **Chat API + RAG (2.7)** – When you need conversational QA over project data.
8. **Reference library (2.6)** – When you want constants and materials in the analysis step.
9. **Plan limits (2.9)** and **audit/run persistence (2.10)** – When moving toward production.

---

## 4. Summary table

| # | Gap | Priority |
|---|-----|----------|
| 2.1 | Persist pipeline (and optionally analyze) to ai_digests, ai_analyses, report_generated | High |
| 2.2 | Upload API + Documents page (Blob + project_files, “Run analysis”) | High |
| 2.3 | Vision extraction: pass fileUrl as image in pipeline | High |
| 2.4 | Document or integrate Python with orchestrator | Medium |
| 2.5 | Reports API + real AIReportViewer (markdown, table, export) | High |
| 2.6 | Reference library tables + migration + optional seed | Low / optional |
| 2.7 | Chat API (threads, messages, RAG) + wire Chat page | Medium |
| 2.8 | Projects API + dashboard home (project list/create) | High |
| 2.9 | Plan limits (project/file caps, feature gating) | Later |
| 2.10 | Run history / audit trail persistence | Later |

This gives you a clear “what’s there” and “what’s needed” so the template can be completed as scaffolding for an AI + Python + reporting app.
