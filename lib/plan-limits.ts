/**
 * Plan limits: free = 1 project, 5 files total. Basic/premium = higher limits (not enforced here).
 * Use before creating a project or uploading a file.
 */

import { db } from '@/lib/db';
import { user_profiles, project_main, project_files } from '@/lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

const FREE_PROJECT_LIMIT = 1;
const FREE_FILE_LIMIT = 5;

export type PlanType = 'free' | 'basic' | 'premium';

/** Get user's plan type (default 'free'). */
export async function getPlanType(userId: string): Promise<PlanType> {
  const [row] = await db
    .select({ planType: user_profiles.planType })
    .from(user_profiles)
    .where(eq(user_profiles.id, userId))
    .limit(1);
  const t = row?.planType?.toLowerCase();
  if (t === 'basic' || t === 'premium') return t as PlanType;
  return 'free';
}

/** Count projects owned by user (project_main.userId). */
export async function countUserProjects(userId: string): Promise<number> {
  const [r] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(project_main)
    .where(eq(project_main.userId, userId));
  return Number(r?.count ?? 0);
}

/** Count files in projects owned by user. */
export async function countUserFiles(userId: string): Promise<number> {
  const projectIds = await db
    .select({ id: project_main.id })
    .from(project_main)
    .where(eq(project_main.userId, userId));
  if (projectIds.length === 0) return 0;
  const ids = projectIds.map((p) => p.id);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(project_files)
    .where(inArray(project_files.projectId, ids));
  return Number(rows[0]?.count ?? 0);
}

/** Return error message if user is at project limit for their plan, else null. */
export async function checkProjectLimit(userId: string): Promise<string | null> {
  const plan = await getPlanType(userId);
  if (plan !== 'free') return null;
  const count = await countUserProjects(userId);
  return count >= FREE_PROJECT_LIMIT
    ? `Free plan allows up to ${FREE_PROJECT_LIMIT} project. Upgrade for more.`
    : null;
}

/** Return error message if user is at file limit for their plan, else null. */
export async function checkFileLimit(userId: string): Promise<string | null> {
  const plan = await getPlanType(userId);
  if (plan !== 'free') return null;
  const count = await countUserFiles(userId);
  return count >= FREE_FILE_LIMIT
    ? `Free plan allows up to ${FREE_FILE_LIMIT} files total. Upgrade for more.`
    : null;
}
