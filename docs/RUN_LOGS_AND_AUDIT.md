# Run logs and audit (DB-backed)

AI runs and report generation are persisted so you can audit usage and debug.

## Tables

- **`logs_ai_runs`** — Each AI pipeline run (or chat call) can be logged here: provider, model, token counts, cost, latency, project/user. Create the table with `scripts/create-logs-tables.sql` in the Neon SQL Editor.
- **`logs_reports`** — When a report is generated from the pipeline, a row links the report to the analysis and project.

The app writes to these tables when they exist (see `lib/ai/logs.ts`). If the tables are missing, logging is skipped and the app still runs.

## Enabling

1. Run `scripts/create-logs-tables.sql` in your Neon project (Dashboard → SQL Editor).
2. No code change needed: the pipeline and report flow already call `writeLogAiRun` and `writeLogReport` where applicable.

## Optional: pipeline_runs

For a dedicated “run” history (e.g. status per task), you can add a `pipeline_runs` table (taskId, runId, status, projectId, fileId, userId, timestamps) and insert from `app/api/ai/run/route.ts` after each run. The current design stores run metadata inside `ai_digests` / `ai_analyses` and uses `logs_ai_runs` for usage/cost.
