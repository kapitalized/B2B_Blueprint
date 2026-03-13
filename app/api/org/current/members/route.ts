/**
 * GET: list members (email, role, joinedAt). POST: add member by email + role (owner/admin).
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { ensureUserProfile } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { org_members, user_profiles } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getDefaultOrgId, canManageOrg } from '@/lib/org';

export async function GET() {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureUserProfile(session);
    const orgId = await getDefaultOrgId(session.userId);
    const rows = await db
      .select({
        userId: org_members.userId,
        email: user_profiles.email,
        role: org_members.role,
        joinedAt: org_members.joinedAt,
      })
      .from(org_members)
      .innerJoin(user_profiles, eq(org_members.userId, user_profiles.id))
      .where(eq(org_members.orgId, orgId))
      .orderBy(desc(org_members.joinedAt));
    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list members';
    console.error('[api/org/current/members GET]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const orgId = await getDefaultOrgId(session.userId);
    const canEdit = await canManageOrg(session.userId, orgId);
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = typeof body.role === 'string' && ['admin', 'analyst'].includes(body.role) ? body.role : 'analyst';
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
    const [profile] = await db
      .select({ id: user_profiles.id })
      .from(user_profiles)
      .where(eq(user_profiles.email, email))
      .limit(1);
    if (!profile) return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
    if (profile.id === session.userId) return NextResponse.json({ error: 'You are already a member' }, { status: 400 });
    const [existing] = await db
      .select({ id: org_members.id })
      .from(org_members)
      .where(and(eq(org_members.orgId, orgId), eq(org_members.userId, profile.id)))
      .limit(1);
    if (existing) return NextResponse.json({ error: 'User is already in the team' }, { status: 400 });
    const [member] = await db
      .insert(org_members)
      .values({ orgId, userId: profile.id, role })
      .returning({ userId: org_members.userId, role: org_members.role, joinedAt: org_members.joinedAt });
    const [withEmail] = await db
      .select({ email: user_profiles.email })
      .from(user_profiles)
      .where(eq(user_profiles.id, profile.id))
      .limit(1);
    return NextResponse.json({ ...member, email: withEmail?.email ?? email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add member';
    console.error('[api/org/current/members POST]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
