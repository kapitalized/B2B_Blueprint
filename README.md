# B2B Blueprint

Next.js 15 (App Router) + Neon / Supabase + Drizzle + Payload. Follow the blueprint docs in **Instruction Cursor** (or parent folder).

## Quick start

1. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`.
   - **Minimum to run (dev):** `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`. Add `OPENROUTER_API_KEY` for AI/chat. Add `BLOB_READ_WRITE_TOKEN` for file uploads. See `docs/NEON_SETUP.md` and `docs/VERCEL_DEPLOY_STEPS.md`.
   - For **Admin** (`/admin`): set `PAYLOAD_SECRET`; Postgres via `DATABASE_URL` or `DATABASE_URI`.

3. **Run**
   - **Development:** `npm run dev` → [http://localhost:3000](http://localhost:3000)
   - **Production:** `npm run build` then `npm start`

4. **Optional: Python engine**
   ```bash
   cd services/python-engine
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
   Then `POST /api/analyze` with `{ "fileUrl": "...", "orgId": "..." }` hits the engine.

## Manual actions (when ready)

- **AI template:** For using this repo as a base for other AI apps, see `docs/AI_App_Template_Readiness.md` (env, API, what to replace).
- **Setup:** Use the `/setup` page; link Neon, Vercel Blob, env vars. See `docs/DATABASE_OPTIONS.md`, `docs/SCHEMA_SETUP.md`.
- **Payload CMS:** Configure `collections/` and `payload.config.ts` when you need admin/CMS.
- **Health / readiness:** `GET /api/health` (always 200). `GET /api/ready` (200 if DB reachable; for load balancers).
- **Tests:** `npm run test` (Vitest). See `app/api/health/route.test.ts`.
- **Chat streaming:** `POST /api/chat/threads/[threadId]/messages` with `?stream=1` or `Accept: text/event-stream` returns SSE; each event is `data: {"content":"..."}`; final event is `data: [DONE]`. See `lib/ai/stream-sse.ts`.

## Structure

- `app/(marketing)` — public SEO pages
- `app/(auth)` — login (Neon Auth or Supabase)
- `app/(dashboard)` — reports, AI (chat, reports, documents), team, billing
- `app/api` — auth, AI, contact, webhooks
- `lib/` — auth, db (Drizzle), AI, blob, Supabase, brand, SEO
- `components/` — ContactForm, AI components
- `collections/` — Payload (Users, Pages, ExternalIntegrations); `globals/SiteSettings`
- **Admin:** `/admin` — Payload CMS (requires Postgres).

If an old **template** folder still exists (leftover from before the move to root), you can delete it after closing any processes using it (e.g. dev server, IDE).
