/**
 * Parse structured citations from assistant message content.
 * Expects a single line with JSON: {"citations": [{"type": "file"|"analysis"|"digest", "id": "<uuid>"}]}
 */

export interface CitationItem {
  type: 'file' | 'analysis' | 'digest';
  id: string;
}

export interface ParsedCitations {
  content: string;
  citations: CitationItem[] | null;
}

/** Match JSON line at end: {"citations": [...]} */
const CITATIONS_PATTERN = /\n\s*\{\s*"citations"\s*:\s*\[[\s\S]*?\]\s*\}\s*$/;

export function parseCitationsFromContent(rawContent: string): ParsedCitations {
  const trimmed = rawContent.trim();
  const match = trimmed.match(CITATIONS_PATTERN);
  if (!match) {
    return { content: trimmed, citations: null };
  }
  const jsonStr = match[0].trim();
  let citations: CitationItem[] | null = null;
  try {
    const parsed = JSON.parse(jsonStr) as { citations?: Array<{ type?: string; id?: string }> };
    if (Array.isArray(parsed.citations)) {
      citations = parsed.citations
        .filter((c) => c && typeof c.type === 'string' && typeof c.id === 'string')
        .filter((c) => ['file', 'analysis', 'digest'].includes(c.type as string))
        .map((c) => ({ type: c.type as CitationItem['type'], id: c.id as string }));
      if (citations.length === 0) citations = null;
    }
  } catch {
    citations = null;
  }
  const content = trimmed.slice(0, trimmed.length - match[0].length).trim();
  return { content: content || trimmed, citations };
}
