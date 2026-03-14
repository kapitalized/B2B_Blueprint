'use client';

import { useProject } from '../ProjectProvider';
import { ProjectNav } from '../ProjectNav';
import { AIReportsContent } from '@/app/(dashboard)/dashboard/ai/reports/AIReportsContent';
import { useParams } from 'next/navigation';

export default function ProjectReportsPage() {
  const params = useParams();
  const project = useProject();
  const shortId = params.shortId as string;
  const slug = params.slug as string;

  if (!project) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const basePath = `/project/${shortId}/${slug}/reports`;
  return (
    <div className="space-y-4">
      <ProjectNav shortId={shortId} slug={slug} />
      <AIReportsContent initialProjectId={project.id} basePath={basePath} />
    </div>
  );
}
