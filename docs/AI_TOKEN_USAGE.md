# AI token usage (OpenRouter)

The app records **token usage and cost** for each pipeline run so you can see what was consumed per analysis.

## Where the data comes from

OpenRouter includes a **`usage`** object in every chat completion response:

- **`prompt_tokens`** – input tokens (prompt + system message)
- **`completion_tokens`** – output tokens (model reply)
- **`total_tokens`** – prompt + completion
- **`cost`** – optional; total USD charged for the request

See [OpenRouter Usage Accounting](https://openrouter.ai/docs/guides/administration/usage-accounting).

## What we store

For each **analysis run** (3-step pipeline: extraction → analysis → synthesis):

1. **Per-step usage** – `extraction`, `analysis`, `synthesis`, each with `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost` (when present).
2. **Totals** – `total_prompt_tokens`, `total_completion_tokens`, `total_tokens`, `total_cost`.

This is saved in **`ai_analyses.token_usage`** (JSONB) and returned in:

- **`POST /api/ai/run`** – response includes `runMetadata.tokenUsage`.
- **`GET /api/reports/[reportId]`** – response includes `runMetadata.tokenUsage`.

## OpenRouter dashboard

For account-level usage and billing:

1. Go to [openrouter.ai](https://openrouter.ai) and sign in.
2. Use **Usage** / **Billing** (or **Settings**) to see spend, usage by model, and history.

Our stored `token_usage` is per run for your own logging and reporting; the OpenRouter dashboard is the source of truth for billing.

## Chat

Chat messages also call OpenRouter but we do not currently persist token usage for chat (only for the pipeline). You can extend the chat route to log or store usage if needed.
