# AI App Template Readiness Review

Assessment of B2B Blueprint as a **reusable template for other AI-based apps** (e.g. extraction → analysis → synthesis pipelines, chat, vision).

---

## 1. What’s in good shape for reuse

| Area | Status | Notes |
|------|--------|--------|
| **LLM abstraction** | ✅ | Single provider surface: `lib/ai/openrouter.ts` — `callOpenRouter()`, usage/cost, no key → stub response. Easy to swap or add another provider behind the same interface. |
| **Model configuration** | ✅ | DB-driven: `getAIModelConfig()` / `setAIModelConfig()` per step (extraction, analysis, synthesis, chat). Admin can change models without code. |
| **Pipeline API** | ✅ | `POST /api/ai/run` — auth, rate limit, project/file loading, then `runPipeline()` → `persistPipelineResult()`. Clear entry point for “run AI” in other apps. |
| **Pipeline contract** | ✅ | `OrchestratorParams` / `PipelineResult`, `ExtractionResult`, `AnalysisResult`, `SynthesisResult`, step trace, token usage. Types in `lib/ai` and re-exported from `lib/ai/index.ts`. |
| **Prompts** | ✅ | Centralized in `lib/ai/base-prompts.ts` and overridable by template (`lib/ai/templates.ts`, `getPromptOverrides(templateId)`). |
| **Persistence** | ✅ | `persistPipelineResult()` writes digests, analyses, step trace, report; `lib/ai/persistence.ts` is DB-agnostic (Drizzle). |
| **Graceful degradation** | ✅ | Missing `OPENROUTER_API_KEY` → stub content so app runs; optional Python engine; optional Hugging Face. |
| **Auth & rate limiting** | ✅ | Session-based API auth (`getSessionForApi`), in-memory rate limit (`lib/rate-limit.ts`) with clear “use Redis in production” comment. |
| **Docs** | ✅ | Many focused docs: `AI_Floorplan_Extraction_Files_And_Workflow.md`, `VERCEL_DEPLOY_STEPS.md`, `NEON_SETUP.md`, `AUTH_GEMINI_CHECKLIST.md`, HF setup, etc. |
| **Env** | ✅ | `.env.example` exists; README points to it and to NEON/VERCEL docs. |

---

## 2. Domain coupling (what to swap for another AI app)

- **Orchestrator logic** is **domain-specific**: floorplan extraction (rooms, box_2d, canvas_size), validation, area-from-bbox, overlay. For a different app you’d replace or bypass `orchestrator-single-pass.ts` / `orchestrator-multilook.ts` (or add a new “pipeline type”) while keeping:
  - `callOpenRouter`, `getAIModelConfig`, `persistPipelineResult`-style flow, and the run API pattern.
- **Prompts** in `base-prompts.ts` are floorplan/takeoff-oriented; **templates** already allow overrides, so a new app can ship its own template IDs and prompt text.
- **APIs**: `/api/reports/[reportId]/overlay` and overlay UI are floorplan-specific; `/api/ai/run`, `/api/ai/batch`, `/api/ai/templates` are generic.
- **DB schema**: `ai_digests`, `ai_analyses`, `report_generated`, `ai_model_config` are generic enough; project/files/reports schema is app-specific but isolated.

**Verdict:** The **pattern** (run API → orchestrator → persist → report) is template-ready. The **default orchestrator and prompts** are construction/floorplan; a new app keeps the pattern and replaces or extends the pipeline and prompts.

---

## 3. Gaps for “template for other AI apps”

1. **Single “AI setup” doc**  
   There is no one doc that says: “To use this repo as an AI app template: 1) Set these env vars, 2) Point to this API, 3) Replace these modules.” Right now you infer from README, NEON_SETUP, VERCEL_DEPLOY, and AI_Floorplan_Extraction_Files_And_Workflow. **Recommendation:** Add `docs/AI_Template_Quickstart.md` (or a section in README) that lists minimal env, main API, and “what to replace” for a new domain.

2. **`.env.example` vs actual AI vars**  
   `.env.example` doesn’t list every AI-related var used in code, e.g.:
   - `OPENROUTER_API_KEY` ✅
   - `HUGGINGFACE_HUB_TOKEN`, `USE_HF_FLOORPLAN_EXTRACTION` (see `docs/HF_HuggingFace_Model_Setup.md`) — missing
   - `ENABLE_EXTRACTION_REVIEW_PASS` (orchestrator switch) — missing
   - `DEBUG_AI_EXTRACTION` — optional; can stay code-only or be added with a comment  
   **Recommendation:** Add commented entries in `.env.example` for HF and `ENABLE_EXTRACTION_REVIEW_PASS` so clone-and-configure is complete.

3. **Orchestrator entry point**  
   `lib/ai/orchestrator.ts` is a thin router (single-pass vs multilook). The real implementation lives in `orchestrator-single-pass.ts` (and `orchestrator-multilook.ts`). For a new app, it’s not obvious that “replace the pipeline” means editing or replacing the *single-pass* (or multilook) file and keeping the router, or replacing the router’s default. **Recommendation:** In `lib/ai/ORCHESTRATOR_SWITCH.md` (or README), add one paragraph: “To use a custom pipeline, implement the same `runPipeline`/types and point `orchestrator.ts` at it.”

4. **Rate limit and production**  
   Rate limiting is in-memory; the code comments that production should use Redis. Template readiness would be clearer if there were a one-line note in README or deploy docs: “For production scale, replace in-memory rate limit with Redis (e.g. @upstash/ratelimit).”

5. **No “minimal AI” path**  
   The app assumes project/file, library context, report type, etc. A minimal “just call OpenRouter and save result” path isn’t documented or exposed as a single API. That’s fine for this app; for a template, a short “Minimal AI flow” subsection (e.g. “If you only need one LLM call: use `callOpenRouter` + your own persistence”) would help.

---

## 4. Checklist for using this repo as an AI app template

- [ ] Copy `.env.example` → `.env.local`; set at least `DATABASE_URL`, `NEON_AUTH_*`, `OPENROUTER_API_KEY`; add `BLOB_*` if using uploads.
- [ ] Add to `.env.example` (and set if needed): `HUGGINGFACE_HUB_TOKEN`, `USE_HF_FLOORPLAN_EXTRACTION`, `ENABLE_EXTRACTION_REVIEW_PASS`.
- [ ] Run DB migrations so `ai_model_config`, `ai_digests`, `ai_analyses`, etc. exist.
- [ ] For a **new domain**: implement or replace the pipeline in `orchestrator-single-pass.ts` (or add a new orchestrator and wire it in `orchestrator.ts`); keep `runPipeline` signature and `PipelineResult` shape; adjust prompts via `base-prompts.ts` and/or templates.
- [ ] Keep using: `callOpenRouter`, `getAIModelConfig`, run API pattern (auth → rate limit → load context → run → persist), and persistence types.
- [ ] For production: plan to replace in-memory rate limit with Redis (or similar) and document in deploy steps.

---

## 5. Summary

| Aspect | Readiness |
|--------|-----------|
| **As a template for “another AI app”** | **Good:** Clear API, config, types, and persistence; LLM behind one interface; prompts/templates overridable. You keep the shell and replace/override the pipeline and prompts. |
| **Documentation** | **Good but scattered:** Add one “AI template quickstart” and ensure `.env.example` and orchestrator docs mention all AI env vars and how to plug a custom pipeline. |
| **Production hardening** | **Noted in code:** Rate limit and “use Redis” are called out; not yet in a single deploy checklist. |

Overall: the app is **ready to use as a template** for other AI-based apps, with the understanding that the **default pipeline and prompts are construction/floorplan-specific** and should be replaced or extended per product. Filling the small doc and env gaps above will make clone-and-customize smoother.
