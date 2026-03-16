/**
 * Admin: delete a project file (and its blob). Allowed: Payload admin or dashboard session.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { project_files, ai_digests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteBlob, isBlobConfigured } from '@/lib/blob';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const [file] = await db.select({ blobUrl: project_files.blobUrl }).from(project_files).where(eq(project_files.id, id)).limit(1);
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    await db.delete(ai_digests).where(eq(ai_digests.fileId, id));
    await db.delete(project_files).where(eq(project_files.id, id));

    if (isBlobConfigured() && file.blobUrl) {
      try {
        await deleteBlob(file.blobUrl);
      } catch (_) {
        // blob delete best-effort
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/files DELETE]', e);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
