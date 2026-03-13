import { redirect, notFound } from 'next/navigation';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { slugify } from '@/lib/project-url';
import { canAccessProject } from '@/lib/org';
import { formatAddress } from '@/lib/address';
import { ProjectProvider } from './ProjectProvider';
import { ProjectDocumentTitle } from './ProjectDocumentTitle';

type Props = { params: Promise<{ shortId: string; slug: string }>; children: React.ReactNode };

export default async function ProjectLayout({ params, children }: Props) {
  const { shortId, slug } = await params;
  const session = await getSessionForApi();
  if (!session) redirect('/login?next=/dashboard');

  // Explicit select: omit number_of_levels so DBs without that column still work
  const [row] = await db
    .select({
      id: project_main.id,
      userId: project_main.userId,
      orgId: project_main.orgId,
      projectName: project_main.projectName,
      projectAddress: project_main.projectAddress,
      addressLine1: project_main.addressLine1,
      addressLine2: project_main.addressLine2,
      addressPostcode: project_main.addressPostcode,
      addressStateProvince: project_main.addressStateProvince,
      addressCountry: project_main.addressCountry,
      projectDescription: project_main.projectDescription,
      projectObjectives: project_main.projectObjectives,
      country: project_main.country,
      siteType: project_main.siteType,
      projectStatus: project_main.projectStatus,
      shortId: project_main.shortId,
      slug: project_main.slug,
      status: project_main.status,
      createdAt: project_main.createdAt,
      updatedAt: project_main.updatedAt,
    })
    .from(project_main)
    .where(eq(project_main.shortId, shortId))
    .limit(1);
  if (!row) notFound();
  const ok = await canAccessProject(row.id, session.userId);
  if (!ok) notFound();
  const expectedSlug = slugify(row.projectName);
  if (slug !== expectedSlug) redirect(`/project/${shortId}/${expectedSlug}`);
  let numberOfLevels = 1;
  try {
    const [levelRow] = await db
      .select({ numberOfLevels: project_main.numberOfLevels })
      .from(project_main)
      .where(eq(project_main.id, row.id))
      .limit(1);
    if (levelRow?.numberOfLevels != null && levelRow.numberOfLevels >= 1) numberOfLevels = levelRow.numberOfLevels;
  } catch {
    // column may not exist yet
  }
  const address = {
    line1: row.addressLine1 ?? '',
    line2: row.addressLine2 ?? '',
    postcode: row.addressPostcode ?? '',
    stateProvince: row.addressStateProvince ?? '',
    country: row.addressCountry ?? '',
  };
  const projectAddress = (formatAddress(address) || row.projectAddress) ?? null;
  const project = { ...row, numberOfLevels, address, projectAddress, country: row.addressCountry ?? row.country };

  return (
    <ProjectProvider project={project}>
      <ProjectDocumentTitle />
      {children}
    </ProjectProvider>
  );
}
