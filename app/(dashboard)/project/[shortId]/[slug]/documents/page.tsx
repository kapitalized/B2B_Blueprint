'use client';

import { useProject } from '../ProjectProvider';
import { ProjectNav } from '../ProjectNav';
import { AIDocumentsContent } from '@/app/(dashboard)/dashboard/ai/documents/page';
import { useParams } from 'next/navigation';

export default function ProjectDocumentsPage() {
  const params = useParams();
  const project = useProject();
  const shortId = params.shortId as string;
  const slug = params.slug as string;

  if (!project) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <ProjectNav shortId={shortId} slug={slug} />
      <AIDocumentsContent initialProjectId={project.id} />
    </div>
  );
}
