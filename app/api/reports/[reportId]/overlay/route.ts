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
import { isPrivateBlobUrl } from '@/lib/blob';

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
  if (!Array.isArray(arr) || arr.length < 4) return null;
  const nums = arr.map((n) => (typeof n === 'number' && !Number.isNaN(n) ? n : Number(n)));
  if (nums.some((n) => Number.isNaN(n))) return null;
  let [a, b, c, d] = nums;
  if (Math.max(a, b, c, d) <= 1 && Math.min(a, b, c, d) >= 0) {
    [a, b, c, d] = [a * 1000, b * 1000, c * 1000, d * 1000];
  }
  if (a <= c && b <= d) return [a, b, c, d];
  if (arr.length === 4 && c > 0 && d > 0) return [a, b, a + d, b + c];
  return [a, b, c, d];
}

/** Coerce unknown to flat [ymin, xmin, ymax, xmax] or null. Handles flat array, nested [[x,y],...], and string numbers. */
function toFlatBbox(raw: unknown): number[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    if (raw.length >= 4 && raw.every((n) => typeof n === 'number')) return normalizeBbox(raw as number[]);
    if (raw.length >= 4 && raw.every((n) => typeof n === 'string' || typeof n === 'number')) return normalizeBbox((raw as (string | number)[]).map(Number));
    // Nested: [[x,y], ...] (world coords, e.g. meters) — compute bbox [ymin, xmin, ymax, xmax]
    if (raw.length > 0 && Array.isArray(raw[0]) && (raw[0] as unknown[]).length >= 2) {
      const points = raw as Array<[number, number] | [string, string]>;
      const xs = points.map((p) => Number(p[0]));
      const ys = points.map((p) => Number(p[1]));
      if (xs.some((x) => Number.isNaN(x)) || ys.some((y) => Number.isNaN(y))) return null;
      const xmin = Math.min(...xs);
      const xmax = Math.max(...xs);
      const ymin = Math.min(...ys);
      const ymax = Math.max(...ys);
      return [ymin, xmin, ymax, xmax];
    }
  }
  return null;
}

function getBbox(item: ExtractionItem): number[] | null {
  const raw =
    item.coordinate_polygons ??
    (item.raw as { bbox?: unknown } | undefined)?.bbox ??
    item.bbox ??
    item.bounding_box ??
    item.bounds ??
    item.coordinates;
  return toFlatBbox(raw);
}

/** Try to parse JSON from text that may be wrapped in markdown or have leading text. */
function extractJsonFromText(text: string): string {
  const start = text.indexOf('[') >= 0 ? text.indexOf('[') : text.indexOf('{');
  const end = text.lastIndexOf(']') >= 0 ? text.lastIndexOf(']') + 1 : text.lastIndexOf('}') + 1;
  if (start >= 0 && end > start) return text.slice(start, end);
  return text;
}

/** Build overlay items from raw extraction: supports items[], rooms[]+box_2d+canvas_size, detections[], and alternate bbox keys. */
function extractOverlayItems(raw: Record<string, unknown> | null | undefined): { id: string; label: string; confidence_score?: number; bbox: number[] }[] {
  const out: { id: string; label: string; confidence_score?: number; bbox: number[] }[] = [];
  const items = raw?.items as ExtractionItem[] | undefined;
  const rooms = raw?.rooms as Array<Record<string, unknown>> | undefined;
  const canvas = raw?.canvas_size as { width?: number; height?: number } | undefined;
  const detections = (
    raw?.detections ?? raw?.detection ?? raw?.results ?? raw?.regions ?? raw?.objects ?? raw?.annotations
  ) as Array<Record<string, unknown>> | undefined;

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
  // Rooms schema: box_2d [x_min, y_min, x_max, y_max] in pixels; normalize to [ymin, xmin, ymax, xmax] 0–1000
  if (out.length === 0 && Array.isArray(rooms) && rooms.length > 0 && (rooms[0] as { box_2d?: unknown })?.box_2d && canvas) {
    const w = typeof canvas.width === 'number' && canvas.width > 0 ? canvas.width : 1000;
    const h = typeof canvas.height === 'number' && canvas.height > 0 ? canvas.height : 1000;
    const scaleX = 1000 / w;
    const scaleY = 1000 / h;
    rooms.forEach((r, i) => {
      const box2d = r.box_2d as number[] | undefined;
      if (!Array.isArray(box2d) || box2d.length < 4) return;
      const [xMin, yMin, xMax, yMax] = box2d.map((n) => Number(n));
      if ([xMin, yMin, xMax, yMax].some((n) => !Number.isFinite(n))) return;
      const ymin = Math.round(yMin * scaleY);
      const xmin = Math.round(xMin * scaleX);
      const ymax = Math.round(yMax * scaleY);
      const xmax = Math.round(xMax * scaleX);
      out.push({
        id: `room-${i + 1}`,
        label: String(r.name ?? r.label ?? r.Name ?? r.room_name ?? `Room ${i + 1}`),
        bbox: [ymin, xmin, ymax, xmax],
      });
    });
  }
  if (Array.isArray(detections) && out.length === 0) {
    detections.forEach((d, i) => {
      const bboxRaw = (d.bbox ?? d.bounding_box ?? d.bounds ?? d.coordinates ?? d.box ?? d.rect) as unknown;
      const bbox = toFlatBbox(bboxRaw);
      if (bbox) {
        out.push({
          id: `det-${i + 1}`,
          label: String(d.label ?? d.name ?? d.room ?? d.category ?? `Detection ${i + 1}`),
          confidence_score: (d.confidence as number | undefined) ?? (d.confidence_score as number | undefined),
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
  // Private Vercel Blob URLs return 403 in browser; use our auth proxy so <img> can load.
  const rawUrl = file?.blobUrl ?? null;
  const imageUrl =
    rawUrl && isPrivateBlobUrl(rawUrl)
      ? `/api/projects/${report.projectId}/files/${fileId}/image`
      : rawUrl;

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

  // If bboxes look like world coords (e.g. meters, values > 1 and < 10000), normalize to 0–1000 per axis for the viewer
  if (items.length > 0) {
    const allX = items.flatMap((i) => [i.bbox[1], i.bbox[3]]);
    const allY = items.flatMap((i) => [i.bbox[0], i.bbox[2]]);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const needsScale = (maxX > 1 || maxY > 1) && maxX < 10000 && maxY < 10000;
    if (needsScale) {
      for (const it of items) {
        const [ymin, xmin, ymax, xmax] = it.bbox;
        it.bbox = [
          ((ymin - minY) / rangeY) * 1000,
          ((xmin - minX) / rangeX) * 1000,
          ((ymax - minY) / rangeY) * 1000,
          ((xmax - minX) / rangeX) * 1000,
        ];
      }
    }
  }

  // Fallback: when no boxes from rawExtraction, parse extraction step response from stepTrace (rooms+box_2d+canvas_size supported)
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
