/**
 * Simple text chunking for RAG. Splits by size with optional overlap.
 */

const DEFAULT_CHUNK_SIZE = 600;
const DEFAULT_OVERLAP = 80;
/** Max chunks to avoid RangeError / memory issues (JS array limit). */
const MAX_CHUNKS = 10_000;

export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
}

/** Split text into overlapping chunks (by character count). Safe against invalid options and runaway loops. */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const rawChunkSize = options.maxChunkSize ?? DEFAULT_CHUNK_SIZE;
  const maxChunkSize = Math.max(1, Math.min(50_000, rawChunkSize));
  const rawOverlap = options.overlap ?? DEFAULT_OVERLAP;
  const overlap = Math.max(0, Math.min(rawOverlap, maxChunkSize - 1));

  const chunks: string[] = [];
  let start = 0;
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) return [];

  while (start < trimmed.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(start + maxChunkSize, trimmed.length);
    if (end < trimmed.length) {
      const nextSpace = trimmed.indexOf(' ', end);
      if (nextSpace !== -1 && nextSpace - start < maxChunkSize + 200) {
        end = nextSpace + 1;
      }
    }
    const slice = trimmed.slice(start, end).trim();
    if (slice.length > 0) chunks.push(slice);
    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end; // always advance to avoid infinite loop
    if (start >= trimmed.length) break;
  }
  return chunks;
}
