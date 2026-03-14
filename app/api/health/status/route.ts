/**
 * Combined health status for header monitor: app, database, model (OpenRouter).
 * GET /api/health/status — no auth required.
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { isOpenRouterConfigured } from '@/lib/ai/openrouter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const status: { app: 'ok'; database: 'ok' | 'error'; model: 'ok' | 'unconfigured' } = {
    app: 'ok',
    database: 'error',
    model: isOpenRouterConfigured() ? 'ok' : 'unconfigured',
  };

  try {
    await db.execute(sql`SELECT 1`);
    status.database = 'ok';
  } catch {
    status.database = 'error';
  }

  return NextResponse.json(status);
}
