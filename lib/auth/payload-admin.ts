/**
 * Check if the request is from an authenticated Payload admin (cookie-based).
 * Used by /api/admin/* to allow Payload admin UI to call these routes.
 */
export async function isPayloadAdmin(request: Request): Promise<boolean> {
  try {
    const cookie = request.headers.get('cookie') ?? '';
    const url = new URL(request.url);
    const base = url.origin;
    // Payload REST API: current user endpoint (try common paths)
    const paths = ['/api/users/me', '/admin/api/users/me'];
    for (const p of paths) {
      const res = await fetch(`${base}${p}`, {
        headers: { cookie },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { user?: { role?: string } };
      if (data?.user?.role === 'admin') return true;
    }
  } catch {
    // ignore
  }
  return false;
}
