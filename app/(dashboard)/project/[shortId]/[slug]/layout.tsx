import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getSessionForApi } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { project_main } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { slugify } from '@/lib/project-url';
import { ProjectProvider } from './ProjectProvider';
import { ProjectDocumentTitle } from './ProjectDocumentTitle';

type Props = { params: Promise<{ shortId: string; slug: string }>; children: React.ReactNode };

export default async function ProjectLayout({ params, children }: Props) {
  const { shortId, slug } = await params;
  const session = await getSessionForApi();
  if (!session) redirect('/login?next=/dashboard');

  const [project] = await db
    .select()
    .from(project_main)
    .where(and(eq(project_main.shortId, shortId), eq(project_main.userId, session.userId)))
    .limit(1);

  if (!project) notFound();
  const expectedSlug = slugify(project.projectName);
  if (slug !== expectedSlug) redirect(`/project/${shortId}/${expectedSlug}`);

  return (
    <ProjectProvider project={project}>
      <ProjectDocumentTitle />
      <div className="mb-2">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
      </div>
      {children}
    </ProjectProvider>
  );
}
