'use client';

/**
 * Draws detection bounding boxes (squares) over a floorplan image.
 * Bbox coords are normalized 0–1000 (see docs/AI_Testing_Prompt_Template.md).
 * Offers download of the image with boxes drawn (PNG).
 */

import { useRef, useEffect, useState } from 'react';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'];
const WINDOW_COLOR = '#0ea5e9';
const DOOR_COLOR = '#f97316';

function scaleCoord(val: number, dim: number): number {
  return (val / 1000) * dim;
}

/** Format label to match report: "Space N: Room name" when id looks like Space N, else just label. */
function formatBoxLabel(item: { id?: string; label?: string }): string {
  const id = (item.id ?? '').trim();
  const label = (item.label ?? '').trim();
  if (/^Space\s*\d+$/i.test(id) && label) return `${id}: ${label}`;
  if (label) return label;
  return id || '—';
}

function drawBoxesOnContext(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  items: { id?: string; bbox: number[]; label?: string }[],
  strokeColor?: string
) {
  items.forEach((item, i) => {
    const bbox = item.bbox;
    if (!Array.isArray(bbox) || bbox.length < 4) return;
    const x = scaleCoord(bbox[1], w);
    const y = scaleCoord(bbox[0], h);
    const width = scaleCoord(bbox[3] - bbox[1], w);
    const height = scaleCoord(bbox[2] - bbox[0], h);
    ctx.strokeStyle = strokeColor ?? COLORS[i % COLORS.length];
    ctx.lineWidth = Math.max(2, Math.min(w, h) / 300);
    ctx.strokeRect(x, y, width, height);
    const text = formatBoxLabel(item);
    if (text && text !== '—') {
      const fontSize = Math.max(10, Math.min(w, h) / 50);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(text, x, Math.max(fontSize + 2, y - 2));
    }
  });
}

export interface OverlayItem {
  id?: string;
  label?: string;
  confidence_score?: number;
  bbox: number[]; // [ymin, xmin, ymax, xmax]
}

interface PlanOverlayViewerProps {
  imageUrl: string | null;
  items: OverlayItem[];
  windows?: OverlayItem[];
  doors?: OverlayItem[];
  className?: string;
}

export default function PlanOverlayViewer({ imageUrl, items, windows = [], doors = [], className = '' }: PlanOverlayViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const hasAny = items.length > 0 || windows.length > 0 || doors.length > 0;

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !imgSize || !hasAny) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = imgSize;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2;
    drawBoxesOnContext(ctx, w, h, items);
    drawBoxesOnContext(ctx, w, h, windows, WINDOW_COLOR);
    drawBoxesOnContext(ctx, w, h, doors, DOOR_COLOR);
  }, [imgSize, items, windows, doors, hasAny]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setImgSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
  };

  async function handleDownload() {
    const img = imgRef.current;
    if (!img || !imageUrl || !hasAny) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w === 0 || h === 0) throw new Error('Image not loaded');
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(img, 0, 0);
      drawBoxesOnContext(ctx, w, h, items);
      drawBoxesOnContext(ctx, w, h, windows, WINDOW_COLOR);
      drawBoxesOnContext(ctx, w, h, doors, DOOR_COLOR);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setDownloadError('Export failed (image may be cross-origin)');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `floorplan-with-boxes-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        },
        'image/png',
        0.92
      );
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  if (!imageUrl) {
    return (
      <p className="text-sm text-muted-foreground">No plan image linked to this report.</p>
    );
  }

  if (!hasAny) {
    return (
      <div className={className}>
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Floorplan"
          className="max-w-full h-auto rounded border"
          onLoad={onImgLoad}
        />
        <p className="text-sm text-muted-foreground mt-2">
          No detection boxes for this run. The vision model may not have returned bounding boxes (e.g. it used a different output format).
          Re-run analysis on this plan with a vision-capable model (e.g. Gemini 2.0 Flash) to get boxes.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative inline-block max-w-full ${className}`} ref={containerRef}>
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Floorplan"
        className="max-w-full h-auto rounded border block"
        onLoad={onImgLoad}
      />
      {imgSize && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: imgSize.w, height: imgSize.h }}
        />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {items.length} space(s){windows.length ? ` · ${windows.length} window(s)` : ''}{doors.length ? ` · ${doors.length} door(s)` : ''}
        </p>
        {(items.length > 0 || windows.length > 0 || doors.length > 0) && (
          <span className="text-xs text-muted-foreground">
            {items.length > 0 && `Spaces: ${items.map((i) => i.id ?? i.label).join(', ')}. `}
            {windows.length > 0 && `Windows: ${windows.map((w) => w.id ?? w.label).join(', ')}. `}
            {doors.length > 0 && `Doors: ${doors.map((d) => d.id ?? d.label).join(', ')}.`}
          </span>
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="text-xs rounded-md border bg-background px-2 py-1.5 hover:bg-muted disabled:opacity-50"
        >
          {downloading ? 'Preparing…' : 'Download image with boxes'}
        </button>
        {downloadError && (
          <span className="text-xs text-destructive">{downloadError}</span>
        )}
      </div>
    </div>
  );
}
