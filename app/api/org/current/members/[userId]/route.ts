/**
 * DELETE: remove a member from the org (owner/admin). Cannot remove last owner.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { org_members } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getDefaultOrgId, canManageOrg, getRoleInOrg } from '@/lib/org';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId: targetUserId } = await params;
  if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  try {
    const orgId = await getDefaultOrgId(session.userId);
    const canEdit = await canManageOrg(session.userId, orgId);
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const targetRole = await getRoleInOrg(targetUserId, orgId);
    if (!targetRole) return NextResponse.json({ error: 'User is not a member' }, { status: 404 });
    if (targetRole === 'owner') {
      const owners = await db
        .select({ userId: org_members.userId })
        .from(org_members)
        .where(and(eq(org_members.orgId, orgId), eq(org_members.role, 'owner')));
      if (owners.length <= 1) return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 });
    }
    await db
      .delete(org_members)
      .where(and(eq(org_members.orgId, orgId), eq(org_members.userId, targetUserId)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove member';
    console.error('[api/org/current/members DELETE]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
