/**
 * Index digest content into ai_knowledge_nodes (chunk + embed + insert) for RAG.
 * Also search ai_knowledge_nodes by embedding for chat context.
 */

import { sql } from '@/lib/db';
import { getEmbedding, getEmbeddings, isEmbeddingsConfigured } from './embeddings';
import { chunkText } from './chunk';

export interface IndexDigestParams {
  projectId: string;
  fileId: string | null;
  /** Text to chunk and embed (e.g. synthesis markdown + summary). */
  text: string;
  chunkOptions?: { maxChunkSize?: number; overlap?: number };
}

/**
 * Chunk text, embed each chunk, insert into ai_knowledge_nodes. No-op if OPENROUTER_API_KEY not set.
 * Deletes existing nodes for this project+file before inserting so re-runs replace content.
 */
export async function indexDigestToKnowledgeNodes(params: IndexDigestParams): Promise<{ indexed: number }> {
  const { projectId, fileId, text, chunkOptions } = params;
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) return { indexed: 0 };

  if (!isEmbeddingsConfigured()) {
    return { indexed: 0 };
  }

  let chunks: string[];
  try {
    chunks = chunkText(trimmed, chunkOptions);
  } catch (err) {
    console.error('[indexDigestToKnowledgeNodes] chunkText failed:', err);
    return { indexed: 0 };
  }
  if (chunks.length === 0) return { indexed: 0 };

  const embeddings = await getEmbeddings(chunks);
  if (embeddings.length !== chunks.length) {
    throw new Error(`Embeddings count mismatch: ${embeddings.length} vs ${chunks.length}`);
  }

  // Remove existing nodes for this project+file so we replace on re-run
  if (fileId) {
    await sql`DELETE FROM ai_knowledge_nodes WHERE project_id = ${projectId} AND file_id = ${fileId}`;
  } else {
    await sql`DELETE FROM ai_knowledge_nodes WHERE project_id = ${projectId} AND file_id IS NULL`;
  }

  const vecStr = (arr: number[]) => `[${arr.join(',')}]`;
  for (let i = 0; i < chunks.length; i++) {
    await sql`
      INSERT INTO ai_knowledge_nodes (project_id, file_id, content, embedding)
      VALUES (${projectId}, ${fileId}, ${chunks[i]}, ${vecStr(embeddings[i])}::vector)
    `;
  }

  return { indexed: chunks.length };
}

export interface KnowledgeSearchHit {
  id: string;
  content: string;
}

/**
 * Semantic search over ai_knowledge_nodes for a project. Returns top chunks by cosine similarity.
 * No-op if embeddings not configured or no nodes exist.
 */
export async function searchKnowledgeNodes(
  projectId: string,
  query: string,
  limit = 8
): Promise<KnowledgeSearchHit[]> {
  if (!isEmbeddingsConfigured() || !query.trim()) return [];
  const embedding = await getEmbedding(query.trim());
  const vecStr = `[${embedding.join(',')}]`;
  const rows = await sql`
    SELECT id, content
    FROM ai_knowledge_nodes
    WHERE project_id = ${projectId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vecStr}::vector
    LIMIT ${limit}
  ` as Array<{ id: string; content: string }>;
  return rows ?? [];
}
