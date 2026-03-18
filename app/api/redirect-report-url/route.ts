/**
 * Resolve projectId + reportId to short URL for redirect.
 * GET ?projectId=uuid&reportId=uuid → { url: "/project/shortId/slug/analyse/reportShortId" } or 404.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main, report_generated } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';

export async function GET(req: Request) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const reportId = searchParams.get('reportId');
  if (!projectId || !reportId) return NextResponse.json({ error: 'projectId and reportId required' }, { status: 400 });
  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [project] = await db
    .select({ shortId: project_main.shortId, slug: project_main.slug })
    .from(project_main)
    .where(eq(project_main.id, projectId))
    .limit(1);
  const [report] = await db
    .select({ shortId: report_generated.shortId, projectId: report_generated.projectId })
    .from(report_generated)
    .where(eq(report_generated.id, reportId))
    .limit(1);
  if (!project?.shortId || !project?.slug || !report?.shortId || report.projectId !== projectId) {
    return NextResponse.json({ error: 'Report or project not found' }, { status: 404 });
  }
  const url = `/project/${project.shortId}/${project.slug}/analyse/${report.shortId}`;
  return NextResponse.json({ url });
}
