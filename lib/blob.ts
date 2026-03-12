/**
 * Vercel Blob storage — use when BLOB_READ_WRITE_TOKEN is set (Neon + Vercel Blob stack).
 * Set BLOB_ACCESS to match your store in Vercel: "public" or "private". Private is recommended for security.
 */

import { del, list, put } from '@vercel/blob';

export function isBlobConfigured(): boolean {
  return typeof process !== 'undefined' && !!process.env.BLOB_READ_WRITE_TOKEN;
}

function getDefaultBlobAccess(): 'public' | 'private' {
  const v = process.env.BLOB_ACCESS?.trim().toLowerCase().replace(/^["']|["']$/g, '');
  return v === 'private' ? 'private' : 'public';
}

/** Upload a file to Vercel Blob. Access must match your store (Vercel dashboard). pathname can include prefix e.g. "documents/abc.pdf". */
export async function uploadBlob(
  pathname: string,
  body: Blob | ArrayBuffer | string | ReadableStream,
  options?: { access?: 'public' | 'private'; contentType?: string; addRandomSuffix?: boolean }
): Promise<{ url: string; pathname: string }> {
  const blob = await put(pathname, body, {
    access: options?.access ?? getDefaultBlobAccess(),
    contentType: options?.contentType,
    addRandomSuffix: options?.addRandomSuffix ?? false,
  });
  return { url: blob.url, pathname: blob.pathname };
}

/** Check if a URL is a Vercel private blob URL (not publicly fetchable by OpenRouter). */
export function isPrivateBlobUrl(url: string): boolean {
  return /\.private\.blob\.vercel-storage\.com\b/i.test(url);
}

/** Fetch a private blob URL with the token and return a data URL for use in vision APIs. */
export async function privateBlobToDataUrl(url: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not set');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const buf = await res.arrayBuffer();
  const b64 = Buffer.from(buf).toString('base64');
  return `data:${contentType};base64,${b64}`;
}

/** List blobs with optional prefix (e.g. "documents/"). */
export async function listBlobs(prefix?: string): Promise<{ blobs: Array<{ url: string; pathname: string; size?: number }>; cursor?: string }> {
  const result = await list({ prefix });
  return {
    blobs: result.blobs.map((b) => ({ url: b.url, pathname: b.pathname, size: b.size })),
    cursor: result.cursor ?? undefined,
  };
}

/** Delete one or more blobs by URL. */
export async function deleteBlob(urlOrUrls: string | string[]): Promise<void> {
  await del(Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls]);
}
