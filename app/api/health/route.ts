/**
 * Health check: always 200 if the app is running. Use for load balancers and uptime checks.
 * GET /api/health
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
