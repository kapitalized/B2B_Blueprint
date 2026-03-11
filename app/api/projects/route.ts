/**
 * Projects API: list (GET) and create (POST). Scoped to current user.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi, ensureUserProfile } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const session = await getSessionForApi();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const projects = await db
      .select()
      .from(project_main)
      .where(eq(project_main.userId, session.userId))
      .orderBy(desc(project_main.createdAt));
    return NextResponse.json(projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionForApi();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { projectName, projectAddress } = body;
    if (!projectName || typeof projectName !== 'string' || !projectName.trim()) {
      return NextResponse.json({ error: 'projectName is required' }, { status: 400 });
    }
    await ensureUserProfile(session);
    const [project] = await db
      .insert(project_main)
      .values({
        userId: session.userId,
        projectName: projectName.trim(),
        projectAddress: typeof projectAddress === 'string' ? projectAddress.trim() || null : null,
        status: 'active',
      })
      .returning();
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
