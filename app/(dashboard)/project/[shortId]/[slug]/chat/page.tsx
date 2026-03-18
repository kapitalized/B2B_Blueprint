'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useProject } from '../ProjectProvider';
import { ProjectNav } from '../ProjectNav';
import { AIChatContent } from '@/app/(dashboard)/dashboard/ai/chat/AIChatContent';
import { useParams } from 'next/navigation';

interface ChatContextFile {
  id: string;
  fileName: string;
  fileType: string;
}

interface ChatContextReport {
  id: string;
  reportTitle: string;
  reportType: string;
  createdAt: string | null;
}

interface ChatContextResponse {
  projectName: string;
  projectDescription: string | null;
  projectObjectives: string | null;
  files: ChatContextFile[];
  recentReports: ChatContextReport[];
}

const REF_TYPE_FILE = 'chat-ref-file';
const REF_TYPE_REPORT = 'chat-ref-report';

export default function ProjectChatPage() {
  const params = useParams();
  const project = useProject();
  const shortId = params.shortId as string;
  const slug = params.slug as string;
  const [chatContext, setChatContext] = useState<ChatContextResponse | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [dropOver, setDropOver] = useState(false);

  useEffect(() => {
    if (!project?.id) return;
    fetch(`/api/projects/${project.id}/chat-context`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setChatContext)
      .catch(() => setChatContext(null));
  }, [project?.id]);

  const toggleFile = useCallback((id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleReport = useCallback((id: string) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropOver(false);
      const type = e.dataTransfer.getData('application/x-chat-ref-type');
      const id = e.dataTransfer.getData('application/x-chat-ref-id');
      if (type === REF_TYPE_FILE && id) setSelectedFileIds((prev) => new Set(prev).add(id));
      if (type === REF_TYPE_REPORT && id) setSelectedReportIds((prev) => new Set(prev).add(id));
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false);
  }, []);

  if (!project) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const hasContext = project.projectDescription || project.projectObjectives;

  return (
    <div className="space-y-4">
      <ProjectNav shortId={shortId} slug={slug} />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-semibold text-foreground">Reference used in this chat</span>
              <Link
                href={`/dashboard?editProject=${project.id}`}
                className="text-primary hover:underline shrink-0 text-xs"
                title="Edit project details"
              >
                Edit project
              </Link>
            </div>
            {hasContext && (
              <div className="space-y-1 mb-3">
                {project.projectDescription && (
                  <p className="text-foreground text-xs">
                    <span className="text-muted-foreground">Description:</span> {project.projectDescription}
                  </p>
                )}
                {project.projectObjectives && (
                  <p className="text-foreground text-xs">
                    <span className="text-muted-foreground">Objectives:</span> {project.projectObjectives}
                  </p>
                )}
              </div>
            )}
            {!hasContext && (
              <p className="text-muted-foreground text-xs mb-3">
                Add a description and objectives so the AI can answer in context.
              </p>
            )}

            <div className="space-y-3">
              <div>
                <span className="font-medium text-muted-foreground block mb-1.5 text-xs">Documents</span>
                {!chatContext ? (
                  <p className="text-muted-foreground text-xs">Loading…</p>
                ) : chatContext.files.length === 0 ? (
                  <p className="text-muted-foreground text-xs">None. Upload in Documents.</p>
                ) : (
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {chatContext.files.map((f) => (
                      <li key={f.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`file-${f.id}`}
                          checked={selectedFileIds.has(f.id)}
                          onChange={() => toggleFile(f.id)}
                          className="rounded border-input"
                        />
                        <label
                          htmlFor={`file-${f.id}`}
                          className="flex-1 min-w-0 text-xs cursor-pointer break-words"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                          title={f.fileName}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-chat-ref-type', REF_TYPE_FILE);
                            e.dataTransfer.setData('application/x-chat-ref-id', f.id);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                        >
                          {f.fileName}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <span className="font-medium text-muted-foreground block mb-1.5 text-xs">Reports</span>
                {!chatContext ? (
                  <p className="text-muted-foreground text-xs">Loading…</p>
                ) : chatContext.recentReports.length === 0 ? (
                  <p className="text-muted-foreground text-xs">None. Run analysis in Analyse.</p>
                ) : (
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {chatContext.recentReports.map((r) => (
                      <li key={r.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`report-${r.id}`}
                          checked={selectedReportIds.has(r.id)}
                          onChange={() => toggleReport(r.id)}
                          className="rounded border-input"
                        />
                        <label
                          htmlFor={`report-${r.id}`}
                          className="flex-1 min-w-0 text-xs cursor-pointer break-words"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                          title={r.reportTitle}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-chat-ref-type', REF_TYPE_REPORT);
                            e.dataTransfer.setData('application/x-chat-ref-id', r.id);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                        >
                          {r.reportTitle}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <p className="text-muted-foreground text-xs mt-2">
              Check items to include in reference. Drag into chat to add.
            </p>
          </section>
        </aside>
        <div
          className={`min-h-0 rounded-lg border transition-colors ${dropOver ? 'border-primary bg-primary/5' : 'border-border'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <AIChatContent
            initialProjectId={project.id}
            referenceFileIds={selectedFileIds.size ? Array.from(selectedFileIds) : undefined}
            referenceReportIds={selectedReportIds.size ? Array.from(selectedReportIds) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
