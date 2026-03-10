/**
 * GET /api/ai/templates — list report templates (recommendation 7).
 */

import { NextResponse } from 'next/server';
import { listTemplates } from '@/lib/ai/templates';

export async function GET() {
  try {
    const templates = listTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
