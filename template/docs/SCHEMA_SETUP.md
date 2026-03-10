# Base schema setup

The template uses **Drizzle** with Neon. Base tables are defined in `lib/db/schema.ts`.

---

## What’s in the base schema

| Table / schema | Purpose |
|----------------|--------|
| **neon_auth.*** | Managed by **Neon Auth** (users, sessions, etc.). Do not edit by hand; run `drizzle-kit pull` after enabling Neon Auth to import. |
| **organizations** | B2B tenants. `orgId` is used in AI run, batch, and audit. Create at least one row (e.g. default org). |
| **documents** | User uploads: `blobUrl` (Vercel Blob), `fileName`, `userId`, optional `orgId`. AI Documents page. |
| **ai_runs** | AI pipeline results: `runId`, `taskId`, `documentId`, `orgId`, `status`, `content_md`, `data_payload`, `critical_warnings_count`. Powers Reports and run history. |
| **audit_log** | Per-run audit (model, step, timestamp). For compliance; `lib/ai/audit-trail` can write here. |
| **chat_threads** | AI Chat: thread per user, with title and timestamps. |
| **chat_messages** | AI Chat: messages in a thread (`role`: user/assistant, `content`). |

---

## Order of operations

1. **Enable Neon Auth** in Neon Console (creates `neon_auth` schema and tables).
2. **Pull Neon Auth tables** (optional; if you want Drizzle types to match DB exactly):
   ```bash
   npx drizzle-kit pull
   ```
   Then merge any new/changed `neon_auth` columns into `lib/db/schema.ts` if the pull overwrites the file.
3. **Generate migrations** for app tables:
   ```bash
   npx drizzle-kit generate
   ```
4. **Apply migrations**:
   ```bash
   npx drizzle-kit migrate
   ```
   Or use Neon’s migration workflow (e.g. run SQL from `drizzle/` folder in Neon SQL Editor).

---

## Minimal “first run” data

- **organizations:** Insert one row (e.g. `name: 'Default', slug: 'default'`) and use its `id` as `orgId` in API calls until you add org switching.
- **neon_auth:** Users/sessions come from sign-up and sign-in (Neon Auth).

---

## Optional: only some tables

If you want to defer AI or chat tables:

- Comment out or drop `ai_runs`, `audit_log`, `chat_threads`, `chat_messages` in `lib/db/schema.ts`, then run `drizzle-kit generate` again.
- The app still runs: AI uses in-memory stubs until you wire it to these tables; chat can be added when you implement the API.
