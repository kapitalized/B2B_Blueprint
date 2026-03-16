/**
 * Admin: list env vars (from process.env, populated by .env.local / Vercel). Values masked. Read-only.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';

const ENV_KEYS = [
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_URL',
  'DATABASE_URL',
  'DATABASE_URI',
  'NEON_AUTH_BASE_URL',
  'NEON_AUTH_COOKIE_SECRET',
  'BLOB_READ_WRITE_TOKEN',
  'BLOB_ACCESS',
  'PAYLOAD_SECRET',
  'OPENROUTER_API_KEY',
  'INTERNAL_SERVICE_KEY',
  'PYTHON_ENGINE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICE_ID_STARTER',
  'STRIPE_PRICE_ID_PRO',
  'BREVO_API_KEY',
  'CONTACT_TO_EMAIL',
  'CONTACT_FROM_EMAIL',
  'CONTACT_FROM_NAME',
  'ENCRYPTION_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'HUGGINGFACE_HUB_TOKEN',
  'HF_TOKEN',
  'USE_HF_FLOORPLAN_EXTRACTION',
];

const SECRET_PATTERN = /KEY|SECRET|PASSWORD|TOKEN|URI|URL/i;

function mask(key: string, value: string): string {
  if (SECRET_PATTERN.test(key)) return '••••••••';
  if (value.length <= 6) return '••••';
  return value.slice(0, 4) + '••••' + value.slice(-2);
}

export async function GET(request: Request) {
  const session = await getSessionForApi();
  if (!session && !(await isPayloadAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vars = ENV_KEYS.map((name) => {
    const raw = process.env[name];
    const set = typeof raw === 'string' && raw.length > 0;
    const preview = set ? mask(name, raw) : '';
    return { name, set, preview };
  });

  return NextResponse.json({ vars });
}
