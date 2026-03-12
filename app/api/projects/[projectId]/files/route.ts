/**
 * Project files: list (GET) and upload (POST). User must own the project.
 */

import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main, project_files } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { isBlobConfigured } from '@/lib/blob';

async function ensureProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(and(eq(project_main.id, projectId), eq(project_main.userId, userId)));
  return !!row;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await ensureProjectOwnership(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  try {
    const files = await db
      .select()
      .from(project_files)
      .where(eq(project_files.projectId, projectId));
    return NextResponse.json(files);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list files';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: 'File storage not configured' }, { status: 503 });
  }
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await ensureProjectOwnership(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file in form field "file"' }, { status: 400 });
  }
  const fileType = (formData.get('fileType') as string) || 'plan';
  const safeType = ['plan', 'defect_report', 'contract'].includes(fileType) ? fileType : 'plan';
  try {
    const pathname = `projects/${projectId}/${Date.now()}-${file.name}`;
    const blob = await put(pathname, file, {
      access: 'private',
      contentType: file.type || undefined,
      addRandomSuffix: true,
    });
    const url = blob.url;
    const blobPath = blob.pathname;
    const [row] = await db
      .insert(project_files)
      .values({
        projectId,
        fileName: file.name,
        fileType: safeType,
        blobUrl: url,
        blobKey: blobPath,
        fileSize: file.size,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[project files upload]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
