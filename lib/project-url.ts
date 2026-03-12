/**
 * Project short IDs and URL slugs for neat URLs: /project/abc123/my-building
 */

const SHORT_ID_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous 0/o, 1/l
const SHORT_ID_LENGTH = 6;

/** Generate a random short ID (6 chars, lowercase alphanumeric). */
export function generateShortId(): string {
  let id = '';
  for (let i = 0; i < SHORT_ID_LENGTH; i++) {
    id += SHORT_ID_CHARS[Math.floor(Math.random() * SHORT_ID_CHARS.length)];
  }
  return id;
}

/** Turn project name into a URL slug e.g. "Test Building" -> "test-building". */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'project';
}

/** Build project path: /project/[shortId]/[slug]. Falls back to query form if no shortId. */
export function projectPath(p: { shortId?: string | null; slug?: string | null; id: string }): string {
  if (p.shortId && p.slug) return `/project/${p.shortId}/${p.slug}`;
  return `/dashboard?projectId=${p.id}`;
}

/** Build project sub-path e.g. /project/abc123/my-building/chat */
export function projectSubPath(
  p: { shortId?: string | null; slug?: string | null; id: string },
  segment: 'chat' | 'documents' | 'reports'
): string {
  if (p.shortId && p.slug) return `/project/${p.shortId}/${p.slug}/${segment}`;
  return `/dashboard/ai/${segment === 'documents' ? 'documents' : segment === 'reports' ? 'reports' : 'chat'}?projectId=${p.id}`;
}
