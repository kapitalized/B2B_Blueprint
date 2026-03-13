/**
 * Embeddings via OpenRouter (same API key as chat). Uses openai/text-embedding-3-small (1536 dims).
 */

const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const API_KEY = process.env.OPENROUTER_API_KEY;

export const EMBEDDING_DIMENSIONS = 1536;

export function isEmbeddingsConfigured(): boolean {
  return Boolean(API_KEY && API_KEY.length > 0);
}

/** Single text → embedding vector (1536 dimensions). */
export async function getEmbedding(text: string): Promise<number[]> {
  const batch = await getEmbeddings([text]);
  if (batch.length === 0) throw new Error('Embedding returned empty');
  return batch[0];
}

/** Batch texts → embedding vectors. OpenRouter accepts array input. */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!isEmbeddingsConfigured()) {
    throw new Error('OPENROUTER_API_KEY not set; cannot embed');
  }
  if (texts.length === 0) return [];

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.length === 1 ? texts[0] : texts,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embeddings API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[]; index?: number }> };
  const out = (data.data ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
  if (out.length !== texts.length) {
    throw new Error(`Embeddings count mismatch: got ${out.length}, expected ${texts.length}`);
  }
  return out;
}
