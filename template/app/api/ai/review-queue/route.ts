/**
 * GET /api/ai/review-queue — list tasks that need human review (recommendation 2).
 * Stub: returns in-memory queue; wire to Supabase ai_tasks when connected.
 */

import { NextResponse } from 'next/server';
import { getAuditLog } from '@/lib/ai/audit-trail';
import { filterNeedsReview } from '@/lib/ai/review-queue';
import type { PipelineResult } from '@/lib/ai/orchestrator';

const stubResults: Array<{ result: PipelineResult; runId: string; documentId?: string }> = [];

export async function GET() {
  try {
    const items = filterNeedsReview(stubResults);
    const auditLog = getAuditLog();
    return NextResponse.json({
      items,
      _auditCount: auditLog.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get review queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
