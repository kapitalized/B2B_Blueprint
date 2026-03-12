# Login & Sign-up Flow Review

## 1. Logic summary

- **Login:** User submits email/password → `authClient.signIn.email()` → on success, redirect via `window.location.href` to `next` (or API `url` if same origin); on error, show `res.error.message`.
- **Sign-up:** Same pattern; password length ≥8 enforced client-side; on success, redirect to `next`.
- **Protected routes:** Middleware checks for session cookie (`neon-auth` or Supabase); no cookie → redirect to `/login?next=/dashboard`. Dashboard also fetches `/api/projects`; 401 → redirect to `/login?next=/dashboard&reason=session`.

## 2. Logic issues (and fixes)

| Issue | Severity | Status |
|-------|----------|--------|
| **Neon cookie prefix** | Medium | Middleware and `get-session-for-layout` use prefix `neon-auth`. The Neon SDK sets `__Secure-neon-auth.session_token` (prod) / `neon-auth.session_token` (dev). `better-auth/cookies` `getSessionCookie(..., { cookiePrefix: 'neon-auth' })` should match. If you see “logged in but 401 on API”, confirm the cookie name in DevTools matches what middleware expects. |
| **Sign-up redirect** | Low | Login uses `res.data?.url` when same origin; sign-up always uses `next`. For consistency, sign-up could also use the API redirect URL if present. |
| **Loading state on redirect** | None | `finally { setLoading(false) }` runs before navigation, so no stuck “Signing in…” state. |

## 3. Cookie deleted – can the user log in again?

**Yes.** Flow:

1. User has no cookie (deleted or new device).
2. They open `/dashboard` → middleware sees no session cookie → redirect to `/login?next=/dashboard`.
3. Or they open dashboard and the client fetches `/api/projects` → 401 → client redirects to `/login?next=/dashboard&reason=session` (“Your session expired or you need to sign in.”).
4. User enters credentials and submits → sign-in creates a new session and sets a new cookie → redirect to `/dashboard`.

No server-side “session store” is required for this; the cookie is the session. Deleting it just means they must sign in again.

## 4. Tracking login errors

| Where | Current behavior | Gap |
|-------|------------------|-----|
| **Client (login page)** | Shows `res.error.message` in UI (e.g. “Invalid email or password”). | No analytics or reporting. |
| **Auth API route** | Catches handler exceptions and logs `[auth POST]: err` for 500s. | Does not inspect response body/status; 401/4xx from upstream are not logged. |
| **Upstream (Neon Auth)** | Returns error in response body; client displays it. | No built-in “track failed logins” in this app. |

**Ways to track login errors:**

1. **Server-side (recommended for security):** In the auth API route, after calling the handler, if the request path is sign-in and the response status is 4xx, log a short line (e.g. email hash, status, no password). Optionally forward to a logging/monitoring service. See “Optional: log auth errors” below.
2. **Client-side:** On `res?.error`, call a small API (e.g. `POST /api/log-event`) or analytics with `{ type: 'login_failed', reason: res.error?.code }`. Avoid sending passwords or full emails.
3. **Rate limiting / alerts:** Handle in infrastructure (e.g. Vercel / Neon) or add a middleware that counts failed attempts by IP and blocks or alerts.

## 5. Optional: log auth errors (server-side)

To help with debugging and security, you can log non-success auth responses for sign-in/sign-up without logging credentials. Example in `app/api/auth/[...all]/route.ts`:

- After `const res = await handler.POST(...)`, if `res.status >= 400` and the path includes `sign-in` or `sign-up`, log e.g. `[auth] sign-in failed status=${res.status}` (and optionally a safe error code from the cloned body). Then return the original `res` unchanged.

This gives you a server-side trail of failed attempts without changing the client or the response to the user.
