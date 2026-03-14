/**
 * Project files: list (GET) and upload (POST). User must own the project.
 */

import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main, project_files } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isBlobConfigured } from '@/lib/blob';
import { canAccessProject } from '@/lib/org';
import { checkFileLimit } from '@/lib/plan-limits';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  try {
    const files = await db
      .select({
        id: project_files.id,
        projectId: project_files.projectId,
        fileName: project_files.fileName,
        fileType: project_files.fileType,
        blobUrl: project_files.blobUrl,
        blobKey: project_files.blobKey,
        fileSize: project_files.fileSize,
        uploadedAt: project_files.uploadedAt,
      })
      .from(project_files)
      .where(eq(project_files.projectId, projectId));
    let withLevel: { buildingLevel: number | null }[] = files.map((f) => ({ ...f, buildingLevel: null as number | null }));
    try {
      const levelRows = await db
        .select({ id: project_files.id, buildingLevel: project_files.buildingLevel })
        .from(project_files)
        .where(eq(project_files.projectId, projectId));
      const levelMap = new Map(levelRows.map((r) => [r.id, r.buildingLevel]));
      withLevel = files.map((f) => ({ ...f, buildingLevel: levelMap.get(f.id) ?? null }));
    } catch {
      // building_level column may not exist
    }
    return NextResponse.json(withLevel);
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
  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const fileLimitError = await checkFileLimit(session.userId);
  if (fileLimitError) return NextResponse.json({ error: fileLimitError }, { status: 403 });
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file in form field "file"' }, { status: 400 });
  }
  const fileType = (formData.get('fileType') as string) || 'plan';
  const safeType = ['plan', 'defect_report', 'contract'].includes(fileType) ? fileType : 'plan';
  const buildingLevelRaw = formData.get('buildingLevel');
  const buildingLevel =
    buildingLevelRaw !== null && buildingLevelRaw !== undefined && buildingLevelRaw !== ''
      ? parseInt(String(buildingLevelRaw), 10)
      : null;
  const safeLevel = buildingLevel != null && Number.isInteger(buildingLevel) && buildingLevel >= 1 ? buildingLevel : null;
  try {
    const pathname = `projects/${projectId}/${Date.now()}-${file.name}`;
    const blob = await put(pathname, file, {
      access: 'private',
      contentType: file.type || undefined,
      addRandomSuffix: true,
    });
    const url = blob.url;
    const blobPath = blob.pathname;
    const baseValues = {
      projectId,
      fileName: file.name,
      fileType: safeType,
      blobUrl: url,
      blobKey: blobPath,
      fileSize: file.size,
    };
    try {
      const [row] = await db
        .insert(project_files)
        .values({ ...baseValues, buildingLevel: safeLevel })
        .returning();
      return NextResponse.json(row);
    } catch (colErr: unknown) {
      const msg = String(colErr instanceof Error ? colErr.message : colErr);
      if (msg.includes('building_level')) {
        const [row] = await db
          .insert(project_files)
          .values(baseValues)
          .returning();
        return NextResponse.json(row);
      }
      throw colErr;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[project files upload]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
