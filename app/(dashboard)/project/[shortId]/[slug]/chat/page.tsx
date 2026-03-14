'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProject } from '../ProjectProvider';
import { ProjectNav } from '../ProjectNav';
import { AIChatContent } from '@/app/(dashboard)/dashboard/ai/chat/AIChatContent';
import { useParams } from 'next/navigation';

interface ChatContextResponse {
  projectName: string;
  projectDescription: string | null;
  projectObjectives: string | null;
  files: { fileName: string; fileType: string }[];
  recentReports: { reportTitle: string; reportType: string; createdAt: string | null }[];
}

export default function ProjectChatPage() {
  const params = useParams();
  const project = useProject();
  const shortId = params.shortId as string;
  const slug = params.slug as string;
  const [chatContext, setChatContext] = useState<ChatContextResponse | null>(null);

  useEffect(() => {
    if (!project?.id) return;
    fetch(`/api/projects/${project.id}/chat-context`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setChatContext)
      .catch(() => setChatContext(null));
  }, [project?.id]);

  if (!project) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const hasContext = project.projectDescription || project.projectObjectives;

  return (
    <div className="space-y-4">
      <ProjectNav shortId={shortId} slug={slug} />
      <section className="rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-semibold text-foreground">Reference used in this chat</span>
          <Link
            href={`/dashboard?editProject=${project.id}`}
            className="text-primary hover:underline shrink-0"
            title="Edit project details (opens dashboard)"
          >
            Edit project
          </Link>
        </div>
        <p className="text-muted-foreground text-xs mb-3">The AI answers using only: project context, the files and reports listed below, and this conversation.</p>
        {hasContext && (
          <div className="space-y-1 mb-3">
            {project.projectDescription && <p className="text-foreground"><span className="text-muted-foreground">Description:</span> {project.projectDescription}</p>}
            {project.projectObjectives && <p className="text-foreground"><span className="text-muted-foreground">Objectives:</span> {project.projectObjectives}</p>}
          </div>
        )}
        {!hasContext && (
          <p className="text-muted-foreground mb-3">
            Add a description and objectives so the AI can answer in context (e.g. “Villa on Spanish coast, want cost estimates from drawings”).
          </p>
        )}
        {chatContext && (
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div>
              <span className="font-medium text-muted-foreground block mb-1">Files in reference</span>
              {chatContext.files.length === 0 ? (
                <p className="text-muted-foreground">None yet. Upload docs in Documents.</p>
              ) : (
                <ul className="list-disc list-inside text-foreground">
                  {chatContext.files.map((f, i) => (
                    <li key={i}>{f.fileName} <span className="text-muted-foreground">({f.fileType})</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <span className="font-medium text-muted-foreground block mb-1">Reports in reference (last 10)</span>
              {chatContext.recentReports.length === 0 ? (
                <p className="text-muted-foreground">None yet. Run analysis on a document.</p>
              ) : (
                <ul className="list-disc list-inside text-foreground">
                  {chatContext.recentReports.map((r, i) => (
                    <li key={i} title={r.createdAt ?? undefined}>
                      <span className="truncate block max-w-[240px]" title={r.reportTitle}>{r.reportTitle}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
      <AIChatContent initialProjectId={project.id} />
    </div>
  );
}
