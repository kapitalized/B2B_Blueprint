# Neon integration: Vercel + localhost

Use the same Neon project for production (Vercel) and development (localhost). The app reads `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET`.

---

## 1. Neon project and connection string

1. Go to [neon.tech](https://neon.tech) and sign in (you already have an account).
2. Create a **new project** (or use an existing one). Choose region and Postgres version.
3. In the project → **Connection details** (or Dashboard).
4. Copy the **connection string** and ensure it ends with `?sslmode=require`.  
   This is your `DATABASE_URL` (e.g. `postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require`).

---

## 2. Enable Neon Auth

1. In the same Neon project, go to **Integrations** or **Auth** (Neon Auth).
2. **Enable Neon Auth**. Neon creates the `neon_auth` schema.
3. Copy the **Auth URL** → this is `NEON_AUTH_BASE_URL`.
4. Generate a **cookie secret** (min 32 characters), e.g.:
   - `openssl rand -base64 32` (terminal), or use a password generator.
   - Save it in your app as `NEON_AUTH_COOKIE_SECRET`. You do **not** set this in the Neon Console—it stays only in your app (`.env.local` / Vercel env).

---

## 3. Vercel (production)

1. In **Vercel Dashboard** → your project → **Settings** → **Environment Variables**.
2. Add for **Production** (and **Preview** if you want):

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | Neon connection string (with `?sslmode=require`) |
   | `NEON_AUTH_BASE_URL` | Neon Auth URL from step 2 |
   | `NEON_AUTH_COOKIE_SECRET` | Your 32+ char cookie secret from step 2 |

3. **Optional:** Link Neon to Vercel so Vercel can inject `DATABASE_URL`:
   - Project → **Storage** or **Integrations** → connect **Neon** → authorize and select the same Neon project.
4. **Redeploy** so new env vars are applied (Deployments → … → Redeploy).

---

## 4. Localhost (development)

1. In the repo root, copy the example env file:
   - `cp .env.example .env.local` (or copy `.env.example` to `.env.local` manually).
2. Edit `.env.local` and set:

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | Same Neon connection string as in Vercel |
   | `NEON_AUTH_BASE_URL` | Same Neon Auth URL |
   | `NEON_AUTH_COOKIE_SECRET` | Same cookie secret (or a separate one for dev) |

3. Add other vars as needed (e.g. `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`). See `.env.example`.
4. Run `npm run dev`. The app will use Neon for DB and auth on localhost.

---

## 5. Optional: sync schema (Drizzle)

If you use Drizzle and custom tables:

- **Pull** schema from Neon (includes `neon_auth`): `npx drizzle-kit pull`
- **Generate** migrations: `npx drizzle-kit generate`
- **Apply** to Neon: `npx drizzle-kit migrate` (uses `DATABASE_URL` from `.env.local` or your shell).

See `docs/SCHEMA_SETUP.md` for details.

---

## 6. Session cookies and different URLs

The app sets the session cookie for your host so login works. In development we use `domain: 'localhost'` so the same cookie works for `localhost:3000`, `localhost:3001`, etc. On **http://localhost** the auth route rewrites cookies (removes `Secure` and `__Secure-` prefix) so the browser will store and send them; otherwise you’d get a redirect loop (login → dashboard → logged out → login). In production (HTTPS), leave cookies as-is. Set `COOKIE_DOMAIN` (e.g. `.your-app.com`) only if you need cross-subdomain sessions; otherwise leave it unset.

**Sessions are tied to the exact origin** (protocol + host + port). These are all different origins, so each has its own session cookie:

- `http://localhost:3000`
- `http://localhost:3001`
- `https://your-app.vercel.app`
- `https://your-app-git-branch.vercel.app` (preview)

So if you log in on **localhost:3000**, then open the app on **Vercel** (or another port), you will not be logged in there. The same user exists in Neon Auth, but the browser does not send the cookie to a different origin.

**What to do:**

1. **Use one origin per workflow.** For local dev use only `http://localhost:3000` (or one port). For production use your main Vercel URL. Log in again when you switch.
2. **Stick to one port locally.** If you sometimes use 3000 and sometimes 3001, use the same port so the cookie is reused (e.g. always `npm run dev` and use 3000).
3. **Preview deployments** have their own URL and thus their own session; log in on each preview if you need to test auth there.

This is normal browser behavior and not a bug in Neon Auth.

---

## Checklist

- [ ] Neon project created; connection string copied (`DATABASE_URL`)
- [ ] Neon Auth enabled; `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` set
- [ ] Vercel: same three env vars added; redeploy done
- [ ] Localhost: `.env.local` with same three vars; `npm run dev` works
