# AI Testing & Evaluation – Review and Minimal Module

## 1. Review of Gemini’s Guide (Feedback doc)

**Useful ideas:**
- **Model comparison (“battle”)** – Same input → N model runs → stamp each with `model_id`/provider → judge (human or model) picks winner or scores.
- **Audit log** – Every run: model, latency, tokens, cost, step type. You already have this in `logs_ai_runs`.
- **Accuracy scoring** – Groundedness, precision, completeness, optional IoU for boxes. Good targets; start with simple “winner/loser” or 1–5 score.
- **Visual verification** – Bounding boxes + overlay images (e.g. Vercel Blob) and side‑by‑side UI. Add later once extraction returns coordinates.

**Keep it simple first:**
- Don’t add a Judge Model (e.g. DeepSeek R1) yet; use **human** “Pick winner” in the UI.
- Don’t build overlays until the pipeline actually returns bounding box data.
- Don’t duplicate logging: reuse `logs_ai_runs` instead of a second “performance” table.

---

## 2. Existing vs New Schema

- **Existing:** `logs_ai_runs` has provider, model, tokens, cost, latency, `metadata` (can hold `stepType`, `fileId`, `evalBatchId`, `detectionOverlayUrl`).
- **New schema (AI_Testing_New_Schema.md):** Adds `ai_performance_logs` (overlaps with `logs_ai_runs`) and `ai_eval_runs` (one row per log, but “battle” = one comparison of N runs).

**Recommendation:** Do **not** add `ai_performance_logs`. Use `logs_ai_runs` for all tracking. Add only **eval** tables so you can group runs and record who won.

---

## 3. Simplest Separate Module: “AI Eval”

**Goal:** Minimal way to (1) track model runs and (2) test/compare models (same input, pick winner or score).

### 3.1 Tracking (already in place)

- Keep using `writeLogAiRun()` for every AI call.
- In **metadata**, pass at least: `stepType` (`'extraction' | 'analysis' | 'synthesis' | 'chat'`), `fileId` when applicable. Optionally `evalBatchId` when the run is part of an eval.

No new tables for tracking.

### 3.2 Testing: Two small tables

**Table 1 – `ai_eval_batches`**  
One row = one comparison (e.g. one file, one “Run A vs B”).

| Column       | Type   | Purpose                    |
|-------------|--------|----------------------------|
| id          | uuid   | PK                         |
| project_id  | uuid   | FK project_main            |
| file_id     | uuid   | FK project_files (optional)|
| created_at  | timestamp | When the comparison ran |

**Table 2 – `ai_eval_results`**  
One row = one model run in that batch, plus optional score/winner.

| Column         | Type   | Purpose                                  |
|----------------|--------|------------------------------------------|
| id             | uuid   | PK                                       |
| eval_batch_id  | uuid   | FK ai_eval_batches                       |
| log_id         | uuid   | FK logs_ai_runs (this run’s log)        |
| accuracy_score | float  | Optional 0–1 or 1–5                     |
| user_feedback  | text   | Optional notes                           |
| is_winner      | text   | `'winner' \| 'loser' \| 'pending'`       |
| evaluated_at   | timestamp | When score/winner was set            |

### 3.3 Flow (simplest)

1. **Eval mode on:** For one upload, create one `ai_eval_batch`, then run the pipeline (or extraction) with **two** model configs (e.g. Gemini vs Claude). Each run calls `writeLogAiRun()` and passes `metadata.evalBatchId = batch.id`.
2. **After both finish:** Insert two `ai_eval_results` rows (eval_batch_id, log_id, is_winner: `'pending'`).
3. **UI:** “Eval” page lists recent batches; for each batch, show the two (or N) runs (model name, latency, cost, snippet of output) and a “Pick winner” button that sets `is_winner` on the chosen row.
4. **Optional:** One aggregated view (e.g. background job or admin page): “Average latency by model”, “Win rate by model”, “Total cost per project” using `logs_ai_runs` (+ join to `ai_eval_results` for win rate).

### 3.4 What to add later (not in v1)

- Bounding box overlay: when extraction returns coordinates, draw on image, upload to Vercel Blob, store URL in `logs_ai_runs.metadata.detectionOverlayUrl`.
- Judge model: optional second step that sets `accuracy_score` or `is_winner` from an LLM.
- RAG-style scores (groundedness, precision, completeness) as extra columns or in a JSON column on `ai_eval_results`.

---

## 4. Summary

| Item                         | Action                                      |
|-----------------------------|---------------------------------------------|
| Tracking                    | Use existing `logs_ai_runs` + metadata      |
| New tables                  | Only `ai_eval_batches` + `ai_eval_results`  |
| Don’t add                   | `ai_performance_logs` (redundant)           |
| Eval UI                     | List batches → side‑by‑side runs → Pick winner |
| Overlays / Judge / RAG triad| Defer until after basic “battle + winner” works |

This keeps the testing logic as a **separate module** (eval tables + eval mode + eval UI) without changing core pipeline behaviour, and uses the simplest methods: one log per run, one batch per comparison, one winner (or score) per run.
