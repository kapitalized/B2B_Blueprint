/**
 * Readiness check: 200 if DB (and optionally other deps) are reachable. Use for k8s/Vercel readiness.
 * GET /api/ready
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    { ready: allOk, checks },
    { status: allOk ? 200 : 503 }
  );
}
