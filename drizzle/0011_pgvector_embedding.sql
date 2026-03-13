-- Enable pgvector extension (required for vector(1536) columns).
-- Neon: run this once per branch; extension must be enabled in the project.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
-- Add embedding column to ai_knowledge_nodes (project RAG). Dimension 1536 matches OpenAI text-embedding-3-small / OpenRouter embedding APIs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ai_knowledge_nodes' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE ai_knowledge_nodes ADD COLUMN embedding vector(1536);
  END IF;
END $$;
--> statement-breakpoint
-- Add embedding column to ref_knowledge_nodes (reference library semantic search). Same dimension.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ref_knowledge_nodes' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE ref_knowledge_nodes ADD COLUMN embedding vector(1536);
  END IF;
END $$;
