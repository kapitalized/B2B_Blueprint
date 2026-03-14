/**
 * GET: Return plan image URL and extraction items with bbox for overlay.
 * Used to draw detection boxes on the floorplan. Items use normalized 0–1000 coords.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { report_generated, ai_analyses, ai_digests, project_files } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { canAccessProject } from '@/lib/org';

interface ExtractionItem {
  id?: string;
  label?: string;
  confidence_score?: number;
  coordinate_polygons?: unknown;
  bbox?: number[];
  bounding_box?: number[];
  bounds?: number[];
  coordinates?: number[];
  raw?: { bbox?: number[]; category?: string };
}

/** Normalize to [ymin, xmin, ymax, xmax] in 0–1000 space. Accepts 0–1000 or 0–1, and [ymin,xmin,ymax,xmax] or [x,y,w,h]. */
function normalizeBbox(arr: number[]): number[] | null {
  if (!Array.isArray(arr) || arr.length < 4 || !arr.every((n) => typeof n === 'number')) return null;
  let [a, b, c, d] = arr;
  if (Math.max(a, b, c, d) <= 1 && Math.min(a, b, c, d) >= 0) {
    [a, b, c, d] = [a * 1000, b * 1000, c * 1000, d * 1000];
  }
  if (a <= c && b <= d) return [a, b, c, d];
  if (arr.length === 4 && c > 0 && d > 0) return [a, b, a + d, b + c];
  return [a, b, c, d];
}

function getBbox(item: ExtractionItem): number[] | null {
  const raw =
    (item.coordinate_polygons as number[] | undefined) ??
    (item.raw as { bbox?: number[] } | undefined)?.bbox ??
    item.bbox ??
    item.bounding_box ??
    item.bounds ??
    item.coordinates;
  return normalizeBbox(Array.isArray(raw) ? raw : []);
}

/** Try to parse JSON from text that may be wrapped in markdown or have leading text. */
function extractJsonFromText(text: string): string {
  const start = text.indexOf('[') >= 0 ? text.indexOf('[') : text.indexOf('{');
  const end = text.lastIndexOf(']') >= 0 ? text.lastIndexOf(']') + 1 : text.lastIndexOf('}') + 1;
  if (start >= 0 && end > start) return text.slice(start, end);
  return text;
}

/** Build overlay items from raw extraction: supports items[], detections[], and alternate bbox keys. */
function extractOverlayItems(raw: Record<string, unknown> | null | undefined): { id: string; label: string; confidence_score?: number; bbox: number[] }[] {
  const out: { id: string; label: string; confidence_score?: number; bbox: number[] }[] = [];
  const items = raw?.items as ExtractionItem[] | undefined;
  const detections = (raw?.detections ?? raw?.detection ?? raw?.results ?? raw?.regions) as Array<Record<string, unknown>> | undefined;

  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const bbox = getBbox(items[i]);
      if (bbox) {
        const it = items[i];
        out.push({
          id: it.id ?? `item-${i + 1}`,
          label: it.label ?? `Item ${i + 1}`,
          confidence_score: it.confidence_score,
          bbox,
        });
      }
    }
  }
  if (Array.isArray(detections) && out.length === 0) {
    detections.forEach((d, i) => {
      const bboxRaw = (d.bbox ?? d.bounding_box ?? d.bounds ?? d.coordinates) as number[] | undefined;
      const bbox = normalizeBbox(Array.isArray(bboxRaw) ? bboxRaw : []);
      if (bbox) {
        out.push({
          id: `det-${i + 1}`,
          label: String(d.label ?? d.name ?? `Detection ${i + 1}`),
          confidence_score: d.confidence as number | undefined,
          bbox,
        });
      }
    });
  }
  return out;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { reportId } = await params;
  if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 });

  const [report] = await db
    .select()
    .from(report_generated)
    .where(eq(report_generated.id, reportId));
  if (!report?.projectId) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  const ok = await canAccessProject(report.projectId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const analysisSourceId = report.analysisSourceId;
  if (!analysisSourceId) {
    return NextResponse.json({ imageUrl: null, items: [] });
  }

  const [analysis] = await db
    .select({
      inputSourceIds: ai_analyses.inputSourceIds,
      rawExtraction: ai_analyses.rawExtraction,
      stepTrace: ai_analyses.stepTrace,
    })
    .from(ai_analyses)
    .where(eq(ai_analyses.id, analysisSourceId));
  const fileIds = analysis?.inputSourceIds as string[] | undefined;
  const fileId = Array.isArray(fileIds) && fileIds.length > 0 ? fileIds[0] : null;
  if (!fileId) return NextResponse.json({ imageUrl: null, items: [] });

  const [file] = await db
    .select({ blobUrl: project_files.blobUrl })
    .from(project_files)
    .where(eq(project_files.id, fileId));
  const imageUrl = file?.blobUrl ?? null;

  // Prefer this run's extraction (ai_analyses.rawExtraction); fall back to latest digest for older reports
  let raw = analysis?.rawExtraction as Record<string, unknown> | undefined;
  if (!raw?.items && !raw?.detections && !raw?.detection) {
    const [digest] = await db
      .select({ rawExtraction: ai_digests.rawExtraction })
      .from(ai_digests)
      .where(
        and(
          eq(ai_digests.projectId, report.projectId),
          eq(ai_digests.fileId, fileId)
        )
      )
      .orderBy(desc(ai_digests.processedAt))
      .limit(1);
    raw = digest?.rawExtraction as Record<string, unknown> | undefined;
  }

  let items = extractOverlayItems(raw);

  // Fallback: parse extraction step response from stepTrace (model may have returned valid JSON we didn't map)
  if (items.length === 0 && analysis?.stepTrace) {
    const steps = analysis.stepTrace as Array<{ step?: string; stepLabel?: string; responsePreview?: string }>;
    const extractionStep = steps?.find(
      (s) => s.step === 'EXTRACTION' || (s.stepLabel && String(s.stepLabel).toLowerCase().includes('bounding'))
    );
    const responseText = extractionStep?.responsePreview;
    if (responseText) {
      try {
        const parsed = JSON.parse(extractJsonFromText(responseText)) as Record<string, unknown>;
        items = extractOverlayItems(parsed);
      } catch {
        // ignore parse errors
      }
    }
  }

  return NextResponse.json({ imageUrl, items });
}
