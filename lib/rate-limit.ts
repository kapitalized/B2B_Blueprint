/**
 * In-memory rate limiter for API routes. For production at scale, use Redis (e.g. @upstash/ratelimit).
 * Limits by key (e.g. userId or IP); returns 429 when exceeded.
 */

const windowMs = 60 * 1000; // 1 minute
const store = new Map<string, { count: number; resetAt: number }>();

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

/**
 * Check and consume one request. Returns null if allowed, or a Response to return (429) if limited.
 * @param identifier - e.g. userId or IP
 * @param prefix - e.g. 'ai-run' or 'chat'
 * @param limit - max requests per window (default 30 for chat, 10 for ai-run)
 */
export function rateLimit(
  identifier: string,
  prefix: string,
  limit: number = 30
): Response | null {
  const now = Date.now();
  const key = getKey(identifier, prefix);
  let entry = store.get(key);

  if (!entry) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return null;
  }

  if (now >= entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return null;
  }

  entry.count += 1;
  if (entry.count > limit) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    );
  }
  return null;
}
