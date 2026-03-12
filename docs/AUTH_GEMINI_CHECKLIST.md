# Auth Checklist (Gemini-style, mapped to B2B Blueprint)

This maps common “login loop” recommendations to our **Neon Auth** setup (we use `@neondatabase/auth`, not raw `better-auth`).

---

## 1. URL / origin (like `BETTER_AUTH_URL`)

We **don’t use** `BETTER_AUTH_URL`. We use:

- **`NEON_AUTH_BASE_URL`** – Neon Auth API (from Neon Console).
- **Auth client** – `window.location.origin + '/api/auth'` (so it always matches the browser).

**What to do:** Use one consistent origin. If you use `http://localhost:3001`, don’t open `http://127.0.0.1:3001` or another port. Optional: set `NEXT_PUBLIC_APP_URL=http://localhost:3001` in `.env.local` and use it anywhere you need a fixed app URL.

---

## 2. Middleware: “lightweight” cookie check (no DB)

We **already** do an optimistic check: we only look for the **presence** of the session cookie (no DB call in Edge).

- **File:** `middleware.ts`
- **Logic:** `getSessionCookie(request, { cookiePrefix: 'neon-auth' })` – if no cookie and path is `/dashboard`, redirect to `/login`. We keep `cookiePrefix: 'neon-auth'` because that’s the cookie name Neon Auth sets.

So the “fix” of “only check for the presence of the cookie” is already in place.

---

## 3. `nextCookies()` plugin

That plugin is for **raw `better-auth`** setups (`betterAuth({ plugins: [nextCookies()] })`).

We use **Neon Auth** (`createNeonAuth` in `lib/auth/server.ts`), and we set the session cookie in a **Server Action** with Next.js `cookies().set()` (`app/(auth)/login/actions.ts`). So we **don’t** have or need a `nextCookies()` plugin.

---

## 4. Dashboard: pass headers to `getSession`

We **already** pass headers:

- **Dashboard layout:** `getSessionForLayout(await headers())` – see `app/(dashboard)/layout.tsx`.
- **get-session-for-layout:** Calls `auth.api.getSession({ headers })` (and, if needed, retries with a mapped cookie header).

So “ensure any server-side getSession uses `headers: await headers()`” is already done.

---

## Summary checklist (for this repo)

| Recommendation              | Our setup |
|----------------------------|-----------|
| URL matches browser        | Client uses `window.location.origin`; use one origin (e.g. always `localhost:3001`). |
| Lightweight middleware     | ✅ We only check for `neon-auth` session cookie presence. |
| nextCookies() plugin       | N/A – we use Neon Auth + Server Action with `cookies().set()`. |
| Pass headers to getSession | ✅ Layout uses `getSessionForLayout(await headers())`. |

---

## If the login loop persists

1. **Clear site data** for the app origin (cookies, storage) and log in again.
2. **Confirm env:** `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ chars), and optional `COOKIE_DOMAIN` (see `docs/NEON_SETUP.md`).
3. **Same origin:** Use the same URL for login and dashboard (e.g. `http://localhost:3001` everywhere).
