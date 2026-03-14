'use client';

/**
 * Draws detection bounding boxes (squares) over a floorplan image.
 * Bbox coords are normalized 0–1000 (see docs/AI_Testing_Prompt_Template.md).
 */

import { useRef, useEffect, useState } from 'react';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'];

function scaleCoord(val: number, dim: number): number {
  return (val / 1000) * dim;
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
  className?: string;
}

export default function PlanOverlayViewer({ imageUrl, items, className = '' }: PlanOverlayViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !imgSize || items.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = imgSize;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    items.forEach((item, i) => {
      const bbox = item.bbox;
      if (!Array.isArray(bbox) || bbox.length < 4) return;
      const ymin = bbox[0];
      const xmin = bbox[1];
      const ymax = bbox[2];
      const xmax = bbox[3];
      const x = scaleCoord(xmin, w);
      const y = scaleCoord(ymin, h);
      const width = scaleCoord(xmax - xmin, w);
      const height = scaleCoord(ymax - ymin, h);

      ctx.strokeStyle = COLORS[i % COLORS.length];
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      if (item.label) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(item.label, x, Math.max(12, y - 2));
      }
    });
  }, [imgSize, items]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setImgSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
  };

  if (!imageUrl) {
    return (
      <p className="text-sm text-muted-foreground">No plan image linked to this report.</p>
    );
  }

  if (items.length === 0) {
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
      <p className="text-xs text-muted-foreground mt-1">{items.length} detection(s)</p>
    </div>
  );
}
