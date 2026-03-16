/**
 * Admin: list project files with project name. Allowed: dashboard session OR Payload admin.
 * GET ?limit=100
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { project_files, project_main } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await getSessionForApi();
  if (!session && !(await isPayloadAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 100, 500);

  try {
    const rows = await db
      .select({
        id: project_files.id,
        fileName: project_files.fileName,
        fileType: project_files.fileType,
        fileSize: project_files.fileSize,
        uploadedAt: project_files.uploadedAt,
        blobUrl: project_files.blobUrl,
        projectName: project_main.projectName,
        projectShortId: project_main.shortId,
      })
      .from(project_files)
      .leftJoin(project_main, eq(project_files.projectId, project_main.id))
      .orderBy(desc(project_files.uploadedAt), desc(project_files.id))
      .limit(limit);

    const files = rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      fileType: r.fileType,
      fileSize: r.fileSize ?? null,
      uploadedAt: r.uploadedAt?.toISOString() ?? null,
      blobUrl: r.blobUrl ?? null,
      projectName: r.projectName ?? '—',
      projectShortId: r.projectShortId ?? null,
    }));

    return NextResponse.json(files);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load files';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
