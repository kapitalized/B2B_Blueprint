/**
 * GET: Stream project file image for display. Uses auth so private Vercel Blob URLs work.
 * Use this as <img src={"/api/projects/.../files/.../image"} /> instead of raw blobUrl.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_files } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';
import { isPrivateBlobUrl } from '@/lib/blob';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return new NextResponse(null, { status: 401 });
  const { projectId, fileId } = await params;
  if (!projectId || !fileId) return new NextResponse(null, { status: 400 });

  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return new NextResponse(null, { status: 404 });

  const [file] = await db
    .select({ blobUrl: project_files.blobUrl, fileName: project_files.fileName })
    .from(project_files)
    .where(and(eq(project_files.id, fileId), eq(project_files.projectId, projectId)));
  if (!file?.blobUrl) return new NextResponse(null, { status: 404 });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const headers: HeadersInit = token && isPrivateBlobUrl(file.blobUrl)
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch(file.blobUrl, { headers });
  if (!res.ok) return new NextResponse(null, { status: res.status === 403 ? 403 : 502 });

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
