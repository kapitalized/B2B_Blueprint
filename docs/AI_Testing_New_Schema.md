# AI Testing – Minimal Schema (Separate Module)

Use **existing** `logs_ai_runs` for all run tracking (model, latency, tokens, cost). Add only these two tables for evaluation/comparison.

```ts
// ---- MODULE: AI EVAL (testing / model comparison) ----
// Depends: logs_ai_runs, project_main, project_files

/** One row per comparison run (e.g. one file → N models). */
export const ai_eval_batches = pgTable('ai_eval_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => project_main.id).notNull(),
  fileId: uuid('file_id').references(() => project_files.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** One row per model run in a batch; stores score/winner. */
export const ai_eval_results = pgTable('ai_eval_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  evalBatchId: uuid('eval_batch_id').references(() => ai_eval_batches.id, { onDelete: 'cascade' }).notNull(),
  logId: uuid('log_id').references(() => logs_ai_runs.id).notNull(),
  accuracyScore: doublePrecision('accuracy_score'),   // optional 0–1 or 1–5
  userFeedback: text('user_feedback'),
  isWinner: text('is_winner').default('pending'),     // 'winner' | 'loser' | 'pending'
  evaluatedAt: timestamp('evaluated_at').defaultNow(),
});
```

**Imports needed:** `uuid`, `text`, `timestamp`, `doublePrecision` from `drizzle-orm/pg-core`; reference `logs_ai_runs` from your main schema.

**Flow:** Create batch → run N models (each write goes to `logs_ai_runs` with `metadata.evalBatchId`) → insert N rows in `ai_eval_results` → UI shows side-by-side and sets `is_winner`.
