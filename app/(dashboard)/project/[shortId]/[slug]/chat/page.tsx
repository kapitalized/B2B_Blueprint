'use client';

import Link from 'next/link';
import { useProject } from '../ProjectProvider';
import { ProjectNav } from '../ProjectNav';
import { AIChatContent } from '@/app/(dashboard)/dashboard/ai/chat/page';
import { useParams } from 'next/navigation';

export default function ProjectChatPage() {
  const params = useParams();
  const project = useProject();
  const shortId = params.shortId as string;
  const slug = params.slug as string;

  if (!project) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const hasContext = project.projectDescription || project.projectObjectives;

  return (
    <div className="space-y-4">
      <ProjectNav shortId={shortId} slug={slug} />
      <section className="rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium text-muted-foreground">Project context (used as reference for chat)</span>
          <Link
            href={`/dashboard?editProject=${project.id}`}
            className="text-primary hover:underline shrink-0"
          >
            Edit
          </Link>
        </div>
        {hasContext ? (
          <div className="space-y-1 text-foreground">
            {project.projectDescription && <p><span className="text-muted-foreground">Description:</span> {project.projectDescription}</p>}
            {project.projectObjectives && <p><span className="text-muted-foreground">Objectives:</span> {project.projectObjectives}</p>}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Add a description and objectives so the AI can answer in context (e.g. “Villa on Spanish coast, want cost estimates from drawings”).
          </p>
        )}
      </section>
      <AIChatContent initialProjectId={project.id} />
    </div>
  );
}
