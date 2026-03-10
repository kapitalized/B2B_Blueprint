/**
 * Storage abstraction: use Vercel Blob when BLOB_READ_WRITE_TOKEN is set (Neon + Blob stack),
 * or Supabase Storage when using the full Supabase stack (wire Supabase Storage in lib/supabase/storage.ts if needed).
 */

import {
  deleteBlob,
  isBlobConfigured,
  listBlobs,
  uploadBlob,
} from './blob';

export type StorageFile = { url: string; pathname: string; size?: number };

export function isStorageConfigured(): boolean {
  return isBlobConfigured();
}

/** Upload a file. Uses Vercel Blob when configured. */
export async function uploadFile(
  pathname: string,
  body: Blob | ArrayBuffer | string | ReadableStream,
  options?: { access?: 'public' | 'private'; contentType?: string }
): Promise<{ url: string; pathname: string } | null> {
  if (!isBlobConfigured()) return null;
  return uploadBlob(pathname, body, options);
}

/** List files with optional prefix (e.g. "documents/"). */
export async function listFiles(prefix?: string): Promise<{ files: StorageFile[]; cursor?: string } | null> {
  if (!isBlobConfigured()) return null;
  const result = await listBlobs(prefix);
  return { files: result.blobs, cursor: result.cursor };
}

/** Delete file(s) by URL. */
export async function deleteFile(urlOrUrls: string | string[]): Promise<boolean> {
  if (!isBlobConfigured()) return false;
  await deleteBlob(urlOrUrls);
  return true;
}
