/**
 * Analyze API — file + params → Python Engine → persist to DB.
 * POST body: { projectId, fileUrl, fileId?, orgId?, taskType?, parameters? }
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { callPythonEngine } from '@/lib/python-client';
import { persistAnalyzeResult } from '@/lib/ai/persistence';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function ensureProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(and(eq(project_main.id, projectId), eq(project_main.userId, userId)));
  return !!row;
}

export async function POST(req: Request) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { projectId, fileId, fileUrl, taskType, parameters } = body;

    if (!projectId || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and fileUrl' },
        { status: 400 }
      );
    }
    const ok = await ensureProjectOwnership(projectId, session.userId);
    if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const pythonResult = await callPythonEngine('/calculate', {
      data: [{ url: fileUrl, type: taskType ?? 'plan', area: 0 }],
      parameters: parameters ?? { thickness: 0.2 },
    });

    if (pythonResult.status === 'error') {
      throw new Error(pythonResult.detail ?? 'Python Engine failed to process');
    }

    const results = (pythonResult.results ?? []) as Array<{
      id?: string;
      label: string;
      area_m2: number;
      volume_m3: number;
      verified?: boolean;
    }>;
    const { analysisId, reportId } = await persistAnalyzeResult({
      projectId,
      fileId: fileId ?? null,
      results,
      metadata: pythonResult.metadata as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      message: 'Analysis completed successfully',
      data: pythonResult.results,
      metadata: pythonResult.metadata,
      persisted: { analysisId, reportId },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Analyze Route Error]:', message);
    return NextResponse.json(
      {
        error: message,
        suggestion: 'Ensure the Python Engine is running and INTERNAL_SERVICE_KEY matches.',
      },
      { status: 500 }
    );
  }
}
