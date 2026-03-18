/**
 * GET: Returns the exact reference used for chat in this project (files + recent reports).
 * Same scope as app/api/chat/threads/[threadId]/messages POST system message.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main, project_files, report_generated } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';

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

  const [project] = await db
    .select({
      projectName: project_main.projectName,
      projectDescription: project_main.projectDescription,
      projectObjectives: project_main.projectObjectives,
    })
    .from(project_main)
    .where(eq(project_main.id, projectId));

  const files = await db
    .select({ id: project_files.id, fileName: project_files.fileName, fileType: project_files.fileType })
    .from(project_files)
    .where(eq(project_files.projectId, projectId));

  const reports = await db
    .select({
      id: report_generated.id,
      reportTitle: report_generated.reportTitle,
      reportType: report_generated.reportType,
      createdAt: report_generated.createdAt,
    })
    .from(report_generated)
    .where(eq(report_generated.projectId, projectId))
    .orderBy(desc(report_generated.createdAt))
    .limit(50);

  return NextResponse.json({
    projectName: project?.projectName ?? 'Unnamed',
    projectDescription: project?.projectDescription ?? null,
    projectObjectives: project?.projectObjectives ?? null,
    files: files.map((f) => ({ id: f.id, fileName: f.fileName, fileType: f.fileType })),
    recentReports: reports.map((r) => ({
      id: r.id,
      reportTitle: r.reportTitle,
      reportType: r.reportType,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
  });
}
