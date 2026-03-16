# Payload CMS Admin

Payload is installed and the admin UI is at **`/admin`**.

## First-time setup

1. Run the app (`npm run dev`) and open **http://localhost:3000/admin**.
2. Create the first user (email + password). This user can log in and manage **Users**, **Pages**, **External Integrations**, and **Site Settings**.

## What to do next (after creating the first user)

The dashboard will look empty until you add content. Do these in order:

1. **Site Settings** (globals)  
   In the sidebar, open **Site Settings**. Set **Site Title** (e.g. ConstructAI), **Title Template** (e.g. `%s | ConstructAI`), and optionally **Default Description** and **Default OG Image**. Save. These values are used for SEO and metadata across the site.

2. **Pages**  
   To create the default pages (About, Features, Pricing, Contact, Privacy Policy, Terms of Service) in one go, with the dev server running run: **`npm run seed:payload`**. Then refresh the admin **Pages** list.  
   Or add pages manually: open **Pages** → **Create New**. Add at least one page, e.g.:
   - **Title:** About | **Slug:** `about`
   - **Title:** Privacy | **Slug:** `privacy`  
   Slugs match the URL path (e.g. `/about`, `/privacy`). Fill **Meta Title** / **Meta Description** if you want custom SEO for that page. Save.  
   The marketing site uses these for `/about`, `/features`, `/pricing`, `/contact` and any slug you add; if a slug exists in the CMS, its title and SEO come from Payload.

3. **Optional**  
   - **Users:** Add more admin/users if needed; set **Role** to Admin or User.  
   - **External Integrations:** Only if you use encrypted API keys (Xero, etc.); requires `ENCRYPTION_KEY` (32 chars) in `.env.local`.

## Running migrations (when you change collections/globals)

Payload CLI loads `payload.config.ts` with Node ESM. For **migrate** commands to work:

1. In `payload.config.ts`, temporarily add **`.ts`** to the four collection/global imports:
   - `'./collections/Users'` → `'./collections/Users.ts'`
   - (and same for Pages, ExternalIntegrations, SiteSettings)
2. Run:
   ```bash
   set PAYLOAD_CONFIG_PATH=.\payload.config.ts
   npm run payload migrate:create your_migration_name
   npm run payload migrate
   ```
3. In any **new** migration file under `migrations/`, change the first line to use **type-only** imports so the runtime doesn’t fail:
   - `import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'`
   - → `import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';\nimport { sql } from '@payloadcms/db-postgres';`
4. Remove the **`.ts`** extensions from the four imports in `payload.config.ts` again (so `next build` succeeds).

## Env

- **DATABASE_URL** – same Postgres as the rest of the app (Payload tables live in the same DB).
- **PAYLOAD_SECRET** – set in `.env.local`; use a strong value in production.

## Collections

- **Users** – admin auth; has `role` (admin / user). External Integrations access is restricted to `role === 'admin'`.
- **Pages** – marketing pages (title, slug, SEO fields).
- **External Integrations** – encrypted API keys (e.g. Xero, Stripe); requires `ENCRYPTION_KEY` (32 chars) in env if you use encryption.
