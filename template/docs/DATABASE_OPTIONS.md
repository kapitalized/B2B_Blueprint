# Database Options — Neon (base), Supabase, MongoDB, Qdrant, Pinecone

The **base setup** is **Neon + Neon Auth + Vercel Blob + Drizzle**. Supabase is an alternative stack. This doc lists all options and what to build for each.

---

## Base stack (default)

| Component | Choice | Env / code |
|-----------|--------|------------|
| **Database** | Neon Postgres | `DATABASE_URL`; Drizzle in `lib/db`, Payload uses same URL |
| **Auth** | Neon Auth (Better Auth) | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`; `lib/auth/server.ts`, `/api/auth/[...all]` |
| **Storage** | Vercel Blob | `BLOB_READ_WRITE_TOKEN`; `lib/blob.ts`, `lib/storage.ts` |
| **ORM** | Drizzle | `lib/db/index.ts`, `lib/db/schema.ts`; `drizzle.config.ts` |

See **/setup** for manual steps (Vercel Dashboard, Neon Console, env vars, optional Cursor MCP). Reference: **Neon+Auth+VercelBlob+Drizzle.md** in the repo.

---

## Alternative stack: Supabase

| Stack | Database | Auth | Storage |
|-------|----------|------|---------|
| **Supabase** | Supabase Postgres (`DATABASE_URI`) | Supabase Auth | Supabase Storage (buckets) |

- When Supabase env vars are set and Neon Auth is not, the app uses Supabase for login and session (see middleware and login page).
- **Payload** uses `DATABASE_URL` or `DATABASE_URI` (Neon or Supabase connection string).

---

## Supabase Auth limits and Vercel auth options

**Supabase free tier limits (Auth):**
- **50,000 MAU** (monthly active users) for Auth on the free plan. One user counts once per billing cycle however often they sign in.
- **2 free projects** per org. If you run many apps or hit MAU, you can hit these limits.

So Supabase Auth can hit the free-plan limit if you grow (MAU) or need more than two projects.

**Does Vercel have auth?**
- **Sign in with Vercel** exists but is for **Vercel accounts only** (developers/team signing into *your* Vercel project or dashboard). It is **not** a general end-user auth solution for your app’s customers.
- Vercel does **not** provide a built-in end-user auth product (no “Vercel Auth” for app users). You use an external provider or build on your DB.

**Auth options when avoiding Supabase (e.g. Neon + Blob stack, or to avoid MAU/project limits):**
- **Neon Auth** — Neon’s managed auth: users and sessions live in your **Neon database** (e.g. `neon_auth` schema). Built on Better Auth; branch-friendly (auth state branches with DB branches). No Supabase; fits **Neon + Vercel Blob** and avoids Supabase MAU/project limits. Use `@neondatabase/auth` (Next.js); configure in Neon Console. [Neon Auth docs](https://neon.tech/docs/neon-auth/overview)
- **NextAuth.js** — Store users and sessions in Neon (Postgres); use Credentials provider or OAuth (Google, GitHub, etc.). No Supabase; fits Neon + Blob.
- **Clerk** — Hosted auth; free tier available; no DB required for auth. Works with any stack.
- **Auth0** — Hosted auth; free tier; integrates with Vercel. Works with any stack.
- **Supabase Auth only** — Keep using Supabase **only for Auth** (no Supabase DB or Storage). You still consume Supabase’s 50k MAU and 2-project limits, but DB and storage are Neon + Blob.

**Summary:** If Supabase free limits are a concern, use **Neon + Vercel Blob** for DB and storage and switch auth to **Neon Auth** (best fit with Neon), **NextAuth.js (Neon)**, or a hosted provider (Clerk, Auth0). The template currently wires Supabase Auth; swapping to Neon Auth or another provider requires replacing the login flow, session handling, and middleware with the new provider’s APIs.

---

## Recommendation: Supabase + auth as standard, add a second DB when needed

**Use Supabase (Postgres + Auth + Storage) as the default for every app.** Use it for:

- **Primary app database** — Payload CMS and any app tables (same Postgres via `DATABASE_URI`).
- **Auth** — Supabase Auth (login, session, RLS) so you don’t build or run your own auth.
- **Storage** — Buckets for uploads (e.g. AI documents, avatars).

**Add a second, specialized database only when the workload clearly needs it:**

| If you need… | Keep Supabase for auth + app DB, add… |
|--------------|--------------------------------------|
| Vector search / RAG / large file sets | **Qdrant** or **Pinecone** (vectors only). |
| Very high‑volume, flexible‑schema scraped data | **MongoDB** for that data; Supabase stays for auth and core app. |
| Serverless Postgres (e.g. scale-to-zero, branching) | **Neon** *instead of* Supabase Postgres for the DB only — you’d still use Supabase for Auth + Storage, and point Payload at Neon’s `DATABASE_URI`. |

**Why standardize on Supabase first?**

1. **One place for identity** — Auth, session, and RLS live in Supabase; all apps use the same model and you don’t maintain a second auth system.
2. **Less to build** — One Postgres, one client, one set of env vars for “default” apps; you only add code for the second DB when you add that feature.
3. **Clear split** — Supabase = “who is the user and what do they own”; second DB = “specialized data (vectors, scraped docs, etc.)”.
4. **Easier onboarding** — New apps start with Supabase; the Setup page and docs stay consistent.

**When to use something other than Supabase Postgres for the main DB:**

- **Neon** — You specifically want serverless Postgres (scale-to-zero, branch-per-env). Keep Supabase for Auth + Storage; point Payload at Neon.
- **MongoDB as primary** — You’re building a scraped-data-first app where most data is document-shaped and you want Payload on MongoDB. You can still use Supabase Auth + Storage and only switch Payload’s adapter to MongoDB.

**Summary:** Default = Supabase (Postgres + Auth + Storage) for all apps. Add Qdrant or Pinecone for vectors, MongoDB for heavy scraped data, or Neon for serverless Postgres — as a *second* database or as a replacement only for the *database* part, not for Auth/Storage.

---

## Overview

| Database   | Typical use in this stack              | Payload CMS      | Primary env var(s)     |
|-----------|-----------------------------------------|------------------|------------------------|
| **Supabase** | App DB + Auth + Storage (default)       | ✅ Postgres adapter, same DB | `DATABASE_URI`, `NEXT_PUBLIC_SUPABASE_*` |
| **MongoDB**  | Scraped data app (flexible docs, high write) | ✅ MongoDB adapter | `MONGODB_URI` |
| **Neon**     | Forecasting / financials (serverless Postgres) | ✅ Same Postgres adapter | `DATABASE_URI` (Neon connection string) |
| **Qdrant**   | Large file sets, vectors, RAG (not main app DB) | ❌ Secondary only | `QDRANT_URL`, `QDRANT_API_KEY` |
| **Pinecone** | Vector search, RAG (alternative to Qdrant) | ❌ Secondary only | `PINECONE_API_KEY`, `PINECONE_INDEX_HOST` |

**Note:** You can combine them (e.g. Supabase for app + auth, Qdrant or Pinecone for vector search).

---

## 1. Supabase (current default)

**Use for:** Main app database, Auth, Storage, optional Realtime. One Postgres for Payload + Supabase client.

### Env vars
- `DATABASE_URI` — Postgres connection string (Project Settings → Database).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### What’s already in the template
- Payload uses `@payloadcms/db-postgres` with `DATABASE_URI`.
- `.env.example` and `/setup` page reference Supabase.

### Code to build
1. **Supabase client** — `lib/supabase/server.ts` and `lib/supabase/client.ts` (createClient from `@supabase/supabase-js`), using anon key for client and service role for server where needed.
2. **Auth** — Auth flow in `(auth)/login` and middleware: signIn/signOut, session from Supabase Auth; protect `/dashboard` routes.
3. **Storage** — Upload/download helpers for buckets (e.g. `documents`, `avatars`); use in AI Documents page and profile avatars.
4. **Optional: RLS** — If you store app data in Supabase tables (not only Payload), add Row Level Security policies and use service role only in trusted server code.
5. **Optional: pgvector** — If using Supabase for embeddings, enable pgvector in the project and add a table + API for vector search (or keep vectors in Qdrant).

---

## 2. MongoDB (scraped data app)

**Use for:** High-volume, flexible-schema scraped data; document-oriented reads/writes.

### Env vars
- `MONGODB_URI` — e.g. `mongodb+srv://user:pass@cluster.mongodb.net/dbname`.

### Payload change
- Replace Postgres adapter with MongoDB adapter in `payload.config.ts`:
  - Install: `@payloadcms/db-mongodb`.
  - Use `mongodbAdapter({ url: process.env.MONGODB_URI })` (or equivalent from Payload 3 docs); remove `postgresAdapter` and `DATABASE_URI` for Payload.
- If you still need Supabase for Auth/Storage only, keep Supabase env vars and use Supabase client only for auth/storage; Payload points at MongoDB.

### Code to build
1. **Payload config** — Swap to `@payloadcms/db-mongodb`; wire `MONGODB_URI`; run Payload migrations for MongoDB.
2. **Collections** — Add Payload collections (or external Mongoose models) for scraped entities: e.g. `ScrapedPage`, `ScrapedItem` with flexible fields or JSON.
3. **Ingest API** — `app/api/ingest/route.ts` (or similar) that accepts scraped payloads and writes to MongoDB (via Payload `payload.create()` or native driver).
4. **Queries** — List/filter scraped data (date range, source, status); consider indexing on `createdAt`, `source`, `status`.
5. **Optional: Dedup** — Unique index or pre-insert check on (url, source) to avoid duplicates.

---

## 3. Neon (forecasting / financials app)

**Use for:** Serverless Postgres (scale-to-zero); same Payload setup as Supabase, different host.

### Env vars
- `DATABASE_URI` — Neon connection string, e.g. `postgres://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require`.

### Payload change
- **None** — Keep `@payloadcms/db-postgres`; only change `DATABASE_URI` to the Neon URL. Optionally add Neon’s connection pooler URL if you use serverless functions with many short-lived connections.

### Code to build
1. **Config** — Point `DATABASE_URI` (and `DATABASE_URL` if used) at Neon in `.env.local` and Vercel; ensure Payload migrations run against Neon.
2. **Financial / time-series collections** — Payload collections for forecasts, time series, or financial entities (e.g. `ForecastRun`, `FinancialSeries`); use date/numeric fields and indexes for range queries.
3. **Read/write APIs** — CRUD or bulk endpoints that use Payload’s API or `getPayload()` for these collections; optionally aggregate or window for charts.
4. **Optional: pgvector on Neon** — If you use Neon for embeddings, enable pgvector and add tables + APIs for vector search (similar to Supabase + pgvector).
5. **Optional: Connection pooling** — If you hit connection limits, use Neon’s pooler and set `DATABASE_URI` to the pooler URL.

---

## 4. Qdrant (large file sets / vectors)

**Use for:** Vector search over large file sets (e.g. RAG, semantic search). **Not** the primary DB for Payload — use alongside Supabase, Neon, or MongoDB.

### Env vars
- `QDRANT_URL` — e.g. `https://xxx.qdrant.io` or `http://localhost:6333`.
- `QDRANT_API_KEY` — Required for Qdrant Cloud.

### Payload
- No change — Payload keeps using Postgres or MongoDB. Qdrant is a separate service.

### Code to build
1. **Client** — `lib/qdrant.ts`: create Qdrant client (e.g. `@qdrant/js-client-rest`) with `QDRANT_URL` and `QDRANT_API_KEY`; expose `upsert`, `search`, and optionally `deleteCollection`.
2. **Embedding pipeline** — Reuse or add an embedding step (e.g. OpenRouter embedding model or a dedicated embedding API); input = text or chunked doc, output = vector. Optionally in `lib/ai/` or Python engine.
3. **Ingest for large files** — Chunk large documents (e.g. by page or token limit); generate embeddings; upsert into Qdrant with metadata (documentId, page, source). API: e.g. `POST /api/ingest/vectors` or from AI Documents upload flow.
4. **Search API** — `POST /api/search/vectors` (or similar): accept query text, embed it, call Qdrant search, return matches with metadata; optionally filter by collection or documentId.
5. **Collections** — Define Qdrant collections (named) and vector dimension from your embedding model; create collection on first run or via a script.
6. **AI integration** — In Chat or Reports, call the vector search API to pull context and pass to the orchestrator or chat model.

---

## 5. Pinecone (vector search, alternative to Qdrant)

**Use for:** Vector search over large file sets (RAG, semantic search). Managed vector DB; use alongside Supabase, Neon, or MongoDB. **Alternative to Qdrant** — choose one for your vector layer.

### Env vars
- `PINECONE_API_KEY` — From Pinecone console (API Keys).
- `PINECONE_INDEX_HOST` or `PINECONE_ENVIRONMENT` — Index host URL (e.g. `xxx.svc.pinecone.io`) or environment; SDK often needs index host for queries/upserts.

### Payload
- No change — Payload keeps using Postgres or MongoDB. Pinecone is a separate service.

### Code to build
1. **Client** — `lib/pinecone.ts`: create Pinecone client (`@pinecone-database/pinecone`); init with `PINECONE_API_KEY`; target index by name and host/environment.
2. **Embedding pipeline** — Same as Qdrant: embed text or chunked docs (OpenRouter embedding or dedicated API); output vectors for upsert.
3. **Ingest** — Chunk large documents; generate embeddings; upsert into Pinecone index with metadata (documentId, page, source). API: e.g. `POST /api/ingest/vectors` (can share shape with Qdrant and switch backend by env).
4. **Search API** — `POST /api/search/vectors`: accept query text, embed it, query Pinecone index, return matches with metadata; optional filter by namespace or metadata.
5. **Index setup** — Create index in Pinecone console (or script): dimension = embedding model size, metric (e.g. cosine); create/use namespaces if you need multiple datasets.
6. **AI integration** — Same as Qdrant: Chat or Reports call vector search and pass context to the orchestrator or chat model.

**Qdrant vs Pinecone:** Both are vector-only. Use Qdrant for self-hosted or Qdrant Cloud; use Pinecone for a fully managed option and simple SDK. Code patterns (embed → upsert → query) are the same; abstract behind a small `lib/vectors.ts` if you want to support both via env.

---

## Summary: what to build per choice

| Option    | Payload config        | New/updated code |
|-----------|------------------------|------------------|
| **Supabase** | Keep Postgres + `DATABASE_URI` | Supabase client, Auth, Storage, optional RLS/pgvector |
| **MongoDB**  | Switch to `@payloadcms/db-mongodb`, `MONGODB_URI` | Payload config, scraped-data collections, ingest API, indexes |
| **Neon**     | Keep Postgres; set `DATABASE_URI` to Neon | Point env at Neon; financial/forecast collections and APIs |
| **Qdrant**   | No change              | Qdrant client, embedding pipeline, ingest + search APIs, AI wiring |
| **Pinecone** | No change              | Pinecone client, embedding pipeline, ingest + search APIs, index setup, AI wiring |

Use one primary DB for Payload (Supabase Postgres, Neon Postgres, or MongoDB); add **Qdrant or Pinecone** when you need vector search over large file sets.
