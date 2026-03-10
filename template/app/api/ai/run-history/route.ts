/**
 * GET /api/ai/run-history?documentId= — list past analyses per document (recommendation 3).
 */

import { NextResponse } from 'next/server';
import { getRunHistory } from '@/lib/ai/run-history';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing query: documentId' },
        { status: 400 }
      );
    }
    const runs = getRunHistory(documentId);
    return NextResponse.json({ documentId, runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get run history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
