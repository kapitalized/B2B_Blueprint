/**
 * POST: Create a quantity report from chat revision (markdown content).
 * Parses a quantities table from the markdown and adds it to ai_analyses + report_generated
 * so it appears on the Quantities page.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main, ai_analyses, report_generated } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parseMarkdownQuantitiesTable } from '@/lib/ai/parse-markdown-table';
import { writeLogReport } from '@/lib/ai/logs';
import { canAccessProject } from '@/lib/org';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const contentMarkdown = typeof body.contentMarkdown === 'string' ? body.contentMarkdown.trim() : '';
  const reportTitle = typeof body.reportTitle === 'string' ? body.reportTitle.trim().slice(0, 200) : null;

  if (!contentMarkdown) {
    return NextResponse.json({ error: 'contentMarkdown is required' }, { status: 400 });
  }

  const items = parseMarkdownQuantitiesTable(contentMarkdown);
  if (items.length === 0) {
    return NextResponse.json(
      { error: 'No quantities table found in the content. Paste a markdown table with columns like Label | Value | Unit.' },
      { status: 400 }
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const title = reportTitle || `Chat revision ${dateStr}`;

  const analysisPayload = {
    items: items.map((row, i) => ({
      id: String(i + 1),
      label: row.label,
      value: row.value,
      unit: row.unit,
      citation_id: String(i + 1),
    })),
    synthesis: { content_md: contentMarkdown, criticalWarnings: [] },
  };

  const [analysis] = await db
    .insert(ai_analyses)
    .values({
      projectId,
      analysisType: 'quantity_takeoff',
      analysisResult: analysisPayload as unknown as Record<string, unknown>,
      inputSourceIds: [],
    })
    .returning({ id: ai_analyses.id });

  if (!analysis?.id) {
    return NextResponse.json({ error: 'Failed to create analysis' }, { status: 500 });
  }

  const [report] = await db
    .insert(report_generated)
    .values({
      projectId,
      reportTitle: title,
      reportType: 'quantity_takeoff',
      content: contentMarkdown,
      analysisSourceId: analysis.id,
    })
    .returning({ id: report_generated.id });

  if (!report?.id) {
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }

  await writeLogReport({
    projectId,
    userId: session.userId,
    reportId: report.id,
    analysisId: analysis.id,
    reportType: 'quantity_takeoff',
    source: 'from_chat',
    fileIds: [],
  });

  return NextResponse.json({
    reportId: report.id,
    analysisId: analysis.id,
    reportTitle: title,
    itemsCount: items.length,
  });
}
