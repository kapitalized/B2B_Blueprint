/**
 * Floorplan extraction using Hugging Face object detection: facebook/detr-resnet-50.
 * DETR returns bounding boxes and COCO class labels; we map them to extraction items with normalized coords.
 *
 * Env: HUGGINGFACE_HUB_TOKEN or HF_TOKEN. If set, HF is used for floorplan extraction unless USE_HF_FLOORPLAN_EXTRACTION=false.
 */

import sharp from 'sharp';

export const HF_MODEL_ID = 'facebook/detr-resnet-50';
/** Object detection: router returns 404 for /models/; use legacy inference API (still works for task-based endpoints). */
const HF_INFERENCE_MODEL_URL = `https://api-inference.huggingface.co/models/${HF_MODEL_ID}`;

export interface HFExtractionResult {
  /** Raw JSON response from the API. */
  rawContent: string;
  /** Detected objects with normalized bbox [ymin, xmin, ymax, xmax] in 0–1000. */
  items: Array<{
    id: string;
    label: string;
    confidence_score: number;
    coordinate_polygons?: number[];
    area_m2?: number;
    length_m?: number;
    width_m?: number;
  }>;
  provider: 'huggingface';
}

function getToken(): string | undefined {
  return process.env.HUGGINGFACE_HUB_TOKEN ?? process.env.HF_TOKEN ?? undefined;
}

/** DETR API response item. */
interface DETRDetection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

/**
 * Call Hugging Face object detection API (DETR).
 * Request: { inputs: base64, parameters?: { threshold } }.
 */
async function callDETRInference(imageBase64: string, options?: { threshold?: number }): Promise<DETRDetection[]> {
  const token = getToken();
  if (!token?.trim()) {
    throw new Error('Hugging Face token not set. Set HUGGINGFACE_HUB_TOKEN or HF_TOKEN in .env.local');
  }
  const body = {
    inputs: imageBase64,
    ...(options?.threshold != null && { parameters: { threshold: options.threshold } }),
  };
  const res = await fetch(HF_INFERENCE_MODEL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hugging Face Inference API ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as DETRDetection[] | { error?: string };
  if (Array.isArray(data)) return data;
  throw new Error(typeof (data as { error?: string }).error === 'string' ? (data as { error: string }).error : JSON.stringify(data));
}

/** Normalize pixel box to 0–1000 coords: [ymin, xmin, ymax, xmax]. */
function normalizeBox(
  box: { xmin: number; ymin: number; xmax: number; ymax: number },
  width: number,
  height: number
): number[] {
  if (width <= 0 || height <= 0) return [box.ymin, box.xmin, box.ymax, box.xmax];
  const scaleX = 1000 / width;
  const scaleY = 1000 / height;
  return [
    Math.round(box.ymin * scaleY),
    Math.round(box.xmin * scaleX),
    Math.round(box.ymax * scaleY),
    Math.round(box.xmax * scaleX),
  ];
}

/**
 * Run floorplan extraction using DETR.
 * Image: data URL or fetchable URL. Image dimensions are read (via sharp) to normalize bounding boxes to 0–1000.
 */
export async function runFloorplanExtractionHF(imageUrl: string): Promise<HFExtractionResult> {
  let base64: string;
  let width = 1000;
  let height = 1000;

  if (imageUrl.startsWith('data:')) {
    const i = imageUrl.indexOf(',');
    base64 = i >= 0 ? imageUrl.slice(i + 1) : imageUrl;
    try {
      const buf = Buffer.from(base64, 'base64');
      const meta = await sharp(buf).metadata();
      if (typeof meta.width === 'number' && meta.width > 0) width = meta.width;
      if (typeof meta.height === 'number' && meta.height > 0) height = meta.height;
    } catch {
      // keep default 1000x1000
    }
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    base64 = buf.toString('base64');
    try {
      const meta = await sharp(buf).metadata();
      if (typeof meta.width === 'number' && meta.width > 0) width = meta.width;
      if (typeof meta.height === 'number' && meta.height > 0) height = meta.height;
    } catch {
      // keep default
    }
  }

  const detections = await callDETRInference(base64, { threshold: 0.5 });
  const rawContent = JSON.stringify(detections);

  const items: HFExtractionResult['items'] = detections.map((d, i) => {
    const bbox = normalizeBox(d.box, width, height);
    const pixelArea = (d.box.xmax - d.box.xmin) * (d.box.ymax - d.box.ymin);
    const canvasArea = width * height;
    const area_m2 = canvasArea > 0 && pixelArea > 0 ? Math.round((pixelArea / canvasArea) * 150 * 100) / 100 : undefined;
    return {
      id: `detection-${i + 1}`,
      label: d.label,
      confidence_score: d.score,
      coordinate_polygons: bbox,
      ...(area_m2 != null ? { area_m2 } : {}),
    };
  });

  return { rawContent, items, provider: 'huggingface' };
}

/** True when HF token is set and HF extraction is not explicitly disabled. */
export function isHFExtractionConfigured(): boolean {
  const token = getToken()?.trim();
  const flag = process.env.USE_HF_FLOORPLAN_EXTRACTION;
  const enabled = Boolean(token) && flag !== 'false' && flag !== '0';
  if (process.env.NODE_ENV !== 'test') {
    console.info('[HF floorplan] configured:', enabled, '| token set:', Boolean(token), '| model:', HF_MODEL_ID);
  }
  return enabled;
}
