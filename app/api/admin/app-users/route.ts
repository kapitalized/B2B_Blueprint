/**
 * Admin: list app users (user_profiles from Drizzle). Allowed: dashboard session OR Payload admin.
 * GET ?limit=100
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { user_profiles } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await getSessionForApi();
  if (!session && !(await isPayloadAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 100, 500);

  try {
    const rows = await db
      .select({
        id: user_profiles.id,
        email: user_profiles.email,
        planType: user_profiles.planType,
        totalStorageUsed: user_profiles.totalStorageUsed,
        createdAt: user_profiles.createdAt,
      })
      .from(user_profiles)
      .orderBy(desc(user_profiles.createdAt))
      .limit(limit);

    const users = rows.map((r) => ({
      id: r.id,
      email: r.email,
      planType: r.planType ?? 'free',
      totalStorageUsed: r.totalStorageUsed ?? 0,
      createdAt: r.createdAt?.toISOString() ?? null,
    }));

    return NextResponse.json(users);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load app users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
