/**
 * Trigger the 3-step AI pipeline (orchestrator). No Supabase required.
 * POST body: { taskId?, orgId, sourceContent?, libraryContext?, benchmarks? }
 */

import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/ai/orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      taskId = `task_${Date.now()}`,
      orgId,
      sourceContent,
      libraryContext,
      benchmarks,
    } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing required field: orgId' },
        { status: 400 }
      );
    }

    const result = await runPipeline({
      taskId,
      orgId,
      sourceContent: sourceContent ?? 'Sample document content for extraction.',
      libraryContext: libraryContext ?? {},
      benchmarks: benchmarks ?? [],
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline failed';
    console.error('[AI run]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
