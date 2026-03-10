/**
 * Vercel Blob storage — use when BLOB_READ_WRITE_TOKEN is set (Neon + Vercel Blob stack).
 * For uploads, AI documents, and other file storage on Vercel free plan.
 */

import { del, list, put } from '@vercel/blob';

export function isBlobConfigured(): boolean {
  return typeof process !== 'undefined' && !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Upload a file to Vercel Blob. pathname can include prefix e.g. "documents/abc.pdf". */
export async function uploadBlob(
  pathname: string,
  body: Blob | ArrayBuffer | string | ReadableStream,
  options?: { access?: 'public' | 'private'; contentType?: string; addRandomSuffix?: boolean }
): Promise<{ url: string; pathname: string }> {
  const blob = await put(pathname, body, {
    access: options?.access ?? 'private',
    contentType: options?.contentType,
    addRandomSuffix: options?.addRandomSuffix ?? false,
  });
  return { url: blob.url, pathname: blob.pathname };
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
