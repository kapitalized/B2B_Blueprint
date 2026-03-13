# Billing & Stripe Module

Distinct module for subscriptions, billing, and Stripe integration.

## Structure

- **`lib/billing/`** — Core module
  - `stripe-client.ts` — Stripe SDK singleton (safe when keys unset)
  - `config.ts` — Plan tiers, price IDs from env, display labels
  - `checkout.ts` — Create Stripe Checkout session (subscription)
  - `portal.ts` — Create Customer Portal session (manage/cancel)
  - `get-org-billing.ts` — Read org billing status from DB
  - `index.ts` — Public exports

- **API routes**
  - `GET /api/billing/status` — Current org billing + `canManage`
  - `POST /api/billing/checkout` — Body `{ tier: 'starter' | 'pro' }` → redirect URL
  - `POST /api/billing/portal` — Redirect URL to Stripe Customer Portal
  - `POST /api/webhooks/stripe` — Webhook; on `checkout.session.completed` updates `org_organisations`

- **Dashboard** — `/dashboard/billing` — Plan status, Starter/Pro cards, Upgrade + Manage Billing (owner only)

## Env

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO` — Recurring price IDs from Stripe Dashboard

## Stripe setup

1. Create products: Starter ($50/mo), Pro ($200/mo) with Recurring prices; copy price IDs into env.
2. Customer Portal: Settings → Billing → Customer Portal — enable subscription cancellation and plan switching.
3. Webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (local); add production URL in Dashboard, event `checkout.session.completed`.

## Security

- Only org **owner** can call checkout/portal (enforced in API).
- Webhook verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`.
- Metadata `orgId` (and `planTier`) on checkout and subscription for tenant-safe updates.

## DB

- `org_organisations`: `stripe_customer_id`, `stripe_subscription_id`, `plan_status`, `plan_tier`.
- Migration: `drizzle/0016_org_plan_tier.sql` adds `plan_tier`.
