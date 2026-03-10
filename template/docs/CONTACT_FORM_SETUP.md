# Contact Form — Summary & Brevo Integration Outline

## Current setup summary

1. **Page**  
   - Marketing contact page at `/contact` (`app/(marketing)/contact/page.tsx`).  
   - Renders the contact form inside a card; linked from header and footer.

2. **Form component**  
   - `components/ContactForm.tsx` (client component).  
   - Fields: **Name**, **Email** (required), **Type** (General question | Report an issue), **Subject**, **Message** (required).  
   - On submit: `POST /api/contact` with JSON body; shows sending/success/error state and resets on success.

3. **API route**  
   - `app/api/contact/route.ts`.  
   - Validates `name`, `email`, `message`; normalizes `type` to `issue` or `general`.  
   - **Current behaviour:** logs payload with `console.info` and returns `{ ok: true }`.  
   - **Does not** send email or persist to DB yet.

4. **Flow**  
   - User submits → `ContactForm` sends `POST /api/contact` with `{ name, email, type, subject, message }` → route validates and logs → JSON response → form shows success or error.

---

## Brevo integration (implemented)

- **`lib/brevo.ts`** — `sendContactEmail(payload, options)` calls Brevo’s `POST /v3/smtp/email` with HTML + text body.
- **`app/api/contact/route.ts`** — After validation, if `BREVO_API_KEY` and `CONTACT_TO_EMAIL` are set, calls `sendContactEmail`; otherwise logs only and still returns success.
- **Env** (see `.env.example`): `BREVO_API_KEY`, `CONTACT_TO_EMAIL`, optional `CONTACT_FROM_EMAIL`, `CONTACT_FROM_NAME`. From must be a verified sender in Brevo.

---

## Outline: Sending with Brevo (3rd‑party sender)

1. **Brevo account & API key**  
   - Sign up at [brevo.com](https://www.brevo.com).  
   - Create an API key (SMTP or Transactional API).  
   - Add to env: `BREVO_API_KEY` (and optionally `CONTACT_TO_EMAIL` for the inbox that receives submissions).

2. **Install SDK (optional)**  
   - `npm install @getbrevo/brevo` (or use `fetch` to Brevo’s HTTP API).  
   - Prefer **server-only**: call Brevo from `app/api/contact/route.ts`, never expose the API key to the client.

3. **API route changes**  
   - After validating the request body, call Brevo to send an email:  
     - **Option A – Transactional (single email to you):** use Brevo’s “Send a transactional email” API; set recipient to your support inbox; body = formatted name, email, type, subject, message.  
     - **Option B – SMTP:** use Brevo SMTP credentials with Nodemailer (or similar) and send the same content.  
   - On Brevo success → return `NextResponse.json({ ok: true })`.  
   - On Brevo error → log and return 500 with a generic error message (do not expose Brevo details to the client).

4. **Email content**  
   - **To:** e.g. `process.env.CONTACT_TO_EMAIL` or a fixed support address.  
   - **From:** a verified sender/domain in Brevo (e.g. `noreply@yourdomain.com`).  
   - **Subject:** e.g. `[Contact] ${type}: ${subject || 'No subject'}`.  
   - **Body (plain or HTML):** include name, email, type, subject, and message; optional: timestamp, origin URL.

5. **Security & env**  
   - Keep `BREVO_API_KEY` in `.env` (and `.env.example` as `BREVO_API_KEY=`) and only use it in the API route.  
   - Optional: rate-limit `POST /api/contact` (e.g. by IP or by email) to reduce abuse.  
   - Optional: add a honeypot or CAPTCHA for bots.

6. **Testing**  
   - Submit the form in dev; confirm Brevo receives the email and the form shows success.  
   - Test with invalid payload and confirm 400; test with Brevo key missing or wrong and confirm 500 and no leak of the key.

---

**Summary:** The form already collects data and posts to `/api/contact`. To “send” via Brevo, add server-side logic in that route to call Brevo’s API (or SMTP) with the validated payload and your chosen recipient and template.
