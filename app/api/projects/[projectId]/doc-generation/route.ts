/**
 * POST: Generate a document (Docx, PDF, or Excel) for the project.
 * Body: { format: 'docx'|'pdf'|'xlsx', filename?: string, ...content } with either report or simple content.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { canAccessProject } from '@/lib/org';
import { generateDoc } from '@/lib/doc-generation';
import type { DocGenerationInput, DocFormat, ReportContent, SimpleDocContent } from '@/lib/doc-generation';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  const ok = await canAccessProject(projectId, session.userId);
  if (!ok) return NextResponse.json({ project: null }, { status: 404 });

  let body: {
    format?: string;
    filename?: string;
    kind?: 'report' | 'simple';
    content?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const format = body.format as DocFormat | undefined;
  if (!format || !['docx', 'pdf', 'xlsx'].includes(format)) {
    return NextResponse.json({ error: 'format must be docx, pdf, or xlsx' }, { status: 400 });
  }
  const kind = body.kind === 'report' ? 'report' : 'simple';
  const content = body.content;
  if (!content || typeof content !== 'object') {
    return NextResponse.json({ error: 'content object is required' }, { status: 400 });
  }

  const input: DocGenerationInput =
    kind === 'report'
      ? { kind: 'report', content: content as ReportContent }
      : { kind: 'simple', content: content as SimpleDocContent };

  try {
    const result = await generateDoc(input, {
      format,
      filename: typeof body.filename === 'string' ? body.filename.slice(0, 120) : undefined,
    });
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.suggestedFilename.replace(/"/g, '\\"')}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Document generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
