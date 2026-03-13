/**
 * Simple text chunking for RAG. Splits by size with optional overlap.
 */

const DEFAULT_CHUNK_SIZE = 600;
const DEFAULT_OVERLAP = 80;

export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
}

/** Split text into overlapping chunks (by character count). */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const maxChunkSize = options.maxChunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = Math.min(options.overlap ?? DEFAULT_OVERLAP, maxChunkSize - 1);
  const chunks: string[] = [];
  let start = 0;
  const trimmed = text.trim();
  if (!trimmed) return [];

  while (start < trimmed.length) {
    let end = start + maxChunkSize;
    if (end < trimmed.length) {
      const nextSpace = trimmed.indexOf(' ', end);
      if (nextSpace !== -1 && nextSpace - start < maxChunkSize + 200) {
        end = nextSpace + 1;
      }
    } else {
      end = trimmed.length;
    }
    chunks.push(trimmed.slice(start, end).trim());
    start = end - overlap;
    if (start >= trimmed.length) break;
  }
  return chunks.filter((c) => c.length > 0);
}
