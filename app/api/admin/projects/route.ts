/**
 * Admin: list all projects (app DB). Allowed: dashboard session OR Payload admin.
 * GET ?limit=100
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { project_main, user_profiles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await getSessionForApi();
  if (!session && !(await isPayloadAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 100, 500);

  try {
    const rows = await db
      .select({
        id: project_main.id,
        projectName: project_main.projectName,
        projectAddress: project_main.projectAddress,
        shortId: project_main.shortId,
        slug: project_main.slug,
        status: project_main.status,
        createdAt: project_main.createdAt,
        userEmail: user_profiles.email,
      })
      .from(project_main)
      .leftJoin(user_profiles, eq(project_main.userId, user_profiles.id))
      .orderBy(desc(project_main.createdAt))
      .limit(limit);

    const projects = rows.map((r) => ({
      id: r.id,
      projectName: r.projectName,
      projectAddress: r.projectAddress ?? null,
      shortId: r.shortId ?? null,
      slug: r.slug ?? null,
      status: r.status ?? null,
      createdAt: r.createdAt?.toISOString() ?? null,
      userEmail: r.userEmail ?? '—',
    }));

    return NextResponse.json(projects);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
