/**
 * POST /api/ai/batch — run pipeline for multiple documents (recommendation 5).
 * Body: { orgId, inputs: BatchRunInput[], libraryContext?, benchmarks? }
 */

import { NextResponse } from 'next/server';
import { runBatchPipeline } from '@/lib/ai/batch';
import type { BatchRunInput } from '@/lib/ai/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orgId, inputs, libraryContext, benchmarks } = body as {
      orgId: string;
      inputs: BatchRunInput[];
      libraryContext?: Record<string, number | string>;
      benchmarks?: Array<{ key: string; value: number; unit?: string }>;
    };

    if (!orgId || !Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid: orgId, inputs (non-empty array)' },
        { status: 400 }
      );
    }

    const result = await runBatchPipeline(inputs, {
      orgId,
      libraryContext,
      benchmarks,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Batch failed';
    console.error('[AI batch]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
