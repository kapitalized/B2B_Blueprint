/**
 * Admin: get one AI analysis run (full JSON output). Allowed: Payload admin or dashboard session.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { ai_analyses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const [row] = await db.select().from(ai_analyses).where(eq(ai_analyses.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      id: row.id,
      projectId: row.projectId,
      analysisType: row.analysisType,
      analysisResult: row.analysisResult,
      rawExtraction: row.rawExtraction,
      stepTrace: row.stepTrace,
      tokenUsage: row.tokenUsage,
      modelsUsed: row.modelsUsed,
      inputSourceIds: row.inputSourceIds,
      createdAt: row.createdAt?.toISOString() ?? null,
      runStartedAt: row.runStartedAt?.toISOString() ?? null,
      runDurationMs: row.runDurationMs,
      inputSizeBytes: row.inputSizeBytes,
      inputPageCount: row.inputPageCount,
    });
  } catch (e) {
    console.error('[admin/ai-runs GET]', e);
    return NextResponse.json({ error: 'Failed to load run' }, { status: 500 });
  }
}
