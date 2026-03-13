-- Billing: store plan tier (starter | pro) from Stripe checkout metadata
ALTER TABLE "org_organisations" ADD COLUMN IF NOT EXISTS "plan_tier" text;
