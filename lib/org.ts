/**
 * Organisations and team members. Roles: owner (billing, account), admin (members, settings), analyst (projects, upload, analysis, reports).
 * Every user gets a personal org (Option A).
 */

import { db } from '@/lib/db';
import { org_organisations, org_members, user_profiles, project_main } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export type OrgMemberRole = 'owner' | 'admin' | 'analyst';

/** Ensure user has a personal org and is owner; set user_profiles.default_org_id if not set. Returns org id. */
export async function ensurePersonalOrg(userId: string): Promise<string> {
  const [existing] = await db
    .select({ orgId: org_members.orgId })
    .from(org_members)
    .where(and(eq(org_members.userId, userId), eq(org_members.role, 'owner')))
    .limit(1);
  if (existing) {
    const [profile] = await db
      .select({ defaultOrgId: user_profiles.defaultOrgId })
      .from(user_profiles)
      .where(eq(user_profiles.id, userId))
      .limit(1);
    if (!profile?.defaultOrgId) {
      await db.update(user_profiles).set({ defaultOrgId: existing.orgId }).where(eq(user_profiles.id, userId));
    }
    return existing.orgId;
  }
  const slug = `personal-${userId.slice(0, 8)}`;
  const [org] = await db
    .insert(org_organisations)
    .values({ name: 'My workspace', slug, type: 'personal' })
    .returning({ id: org_organisations.id });
  if (!org?.id) throw new Error('Failed to create personal org');
  await db.insert(org_members).values({ orgId: org.id, userId, role: 'owner' });
  await db.update(user_profiles).set({ defaultOrgId: org.id }).where(eq(user_profiles.id, userId));
  return org.id;
}

/** Get user's default org id (personal if none set). Creates personal org if missing. */
export async function getDefaultOrgId(userId: string): Promise<string> {
  const [p] = await db
    .select({ defaultOrgId: user_profiles.defaultOrgId })
    .from(user_profiles)
    .where(eq(user_profiles.id, userId))
    .limit(1);
  if (p?.defaultOrgId) return p.defaultOrgId;
  return ensurePersonalOrg(userId);
}

/** Get user's role in org, or null if not a member. */
export async function getRoleInOrg(userId: string, orgId: string): Promise<OrgMemberRole | null> {
  const [m] = await db
    .select({ role: org_members.role })
    .from(org_members)
    .where(and(eq(org_members.orgId, orgId), eq(org_members.userId, userId)))
    .limit(1);
  return (m?.role as OrgMemberRole) ?? null;
}

/** Check if user can access org's projects (any member role). */
export async function canAccessOrg(userId: string, orgId: string): Promise<boolean> {
  const role = await getRoleInOrg(userId, orgId);
  return role !== null;
}

/** Check if user can manage org (invite/remove members, org settings). Owner or Admin. */
export async function canManageOrg(userId: string, orgId: string): Promise<boolean> {
  const role = await getRoleInOrg(userId, orgId);
  return role === 'owner' || role === 'admin';
}

/** Check if user can manage billing for org. Owner only. */
export async function canManageBilling(userId: string, orgId: string): Promise<boolean> {
  const role = await getRoleInOrg(userId, orgId);
  return role === 'owner';
}

/** Org IDs the user is a member of (any role). */
export async function getOrgIdsForUser(userId: string): Promise<string[]> {
  const rows = await db.select({ orgId: org_members.orgId }).from(org_members).where(eq(org_members.userId, userId));
  return rows.map((r) => r.orgId);
}

/** Check if user can access project: they are project owner (userId) OR member of project's org. */
export async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db
    .select({ userId: project_main.userId, orgId: project_main.orgId })
    .from(project_main)
    .where(eq(project_main.id, projectId))
    .limit(1);
  if (!project) return false;
  if (project.userId === userId) return true;
  if (project.orgId) return canAccessOrg(userId, project.orgId);
  return false;
}
