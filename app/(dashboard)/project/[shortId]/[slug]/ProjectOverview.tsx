'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProject } from './ProjectProvider';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

interface ProjectFile {
  id: string;
  fileName: string;
  fileType: string;
  blobUrl: string;
  buildingLevel?: number | null;
}

export function ProjectOverview({
  basePath,
}: {
  basePath: string;
}) {
  const project = useProject();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [reports, setReports] = useState<{ reportType: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project?.id) return;
    Promise.all([
      fetch(`/api/projects/${project.id}/files`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/projects/${project.id}/reports`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([fileList, reportList]) => {
        setFiles(Array.isArray(fileList) ? fileList : []);
        setReports(Array.isArray(reportList) ? reportList : []);
      })
      .catch(() => {
        setFiles([]);
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, [project?.id]);

  const docsCount = files.length;
  const reportsCount = reports.length;
  const quantitiesCount = reports.filter((r) => r.reportType === 'quantity_takeoff').length;
  const levels = Math.max(1, project?.numberOfLevels ?? 1);
  const filesByLevel = new Map<number, ProjectFile[]>();
  for (const f of files) {
    const level = f.buildingLevel ?? 1;
    if (!filesByLevel.has(level)) filesByLevel.set(level, []);
    filesByLevel.get(level)!.push(f);
  }
  const getImageForLevel = (level: number) =>
    (filesByLevel.get(level) ?? []).find((f) => IMAGE_EXT.test(f.fileName)) ?? filesByLevel.get(level)?.[0];
  const getFirstFileForLevel = (level: number) => filesByLevel.get(level)?.[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
      {/* Left: Project card then floorplans by level */}
      <div className="space-y-4 min-w-0">
        {/* Project summary card – same layout as dashboard project cards */}
        <section className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{project?.projectName}</p>
            {project?.projectAddress && <p className="text-xs text-muted-foreground truncate">{project.projectAddress}</p>}
            {([project?.country, project?.projectStatus, (project?.numberOfLevels != null && project.numberOfLevels >= 1) ? `${project.numberOfLevels} level${project.numberOfLevels !== 1 ? 's' : ''}` : null].filter(Boolean) as string[]).length > 0 && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {[project?.country, project?.projectStatus, (project?.numberOfLevels != null && project.numberOfLevels >= 1) ? `${project.numberOfLevels} level${project.numberOfLevels !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
              </p>
            )}
            {project?.projectDescription && <p className="text-xs text-muted-foreground truncate mt-0.5">{project.projectDescription}</p>}
            {project?.projectObjectives && <p className="text-xs text-muted-foreground truncate mt-0.5">{project.projectObjectives}</p>}
            {basePath && (
              <p className="mt-1.5 text-xs text-muted-foreground font-mono truncate" title={basePath}>
                {basePath}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard?editProject=${project?.id}`} className="text-sm text-primary hover:underline">
              Edit
            </Link>
            <Link href="/dashboard" className="text-sm text-primary hover:underline">
              Dashboard
            </Link>
            <Link href={`${basePath}/documents`} className="text-sm text-primary hover:underline">
              Documents
            </Link>
            <Link href={`${basePath}/quantities`} className="text-sm text-primary hover:underline">
              Quantities
            </Link>
            <Link href={`${basePath}/analyse`} className="text-sm text-primary hover:underline">
              Analyse
            </Link>
            <Link href={`${basePath}/chat`} className="text-sm text-primary hover:underline">
              Chat
            </Link>
          </div>
        </section>

        {Array.from({ length: levels }, (_, i) => i + 1).map((level) => {
          const imageFile = getImageForLevel(level);
          const firstFile = getFirstFileForLevel(level);
          return (
            <section key={level} className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/30 text-sm font-medium">
                Level {level} floorplan
              </div>
              <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center">
                {imageFile && project?.id ? (
                  <img
                    src={`/api/projects/${project.id}/files/${imageFile.id}/image`}
                    alt={imageFile.fileName}
                    className="w-full h-full object-contain"
                  />
                ) : firstFile ? (
                  <div className="text-center p-6">
                    <p className="text-sm font-medium text-foreground truncate max-w-xs mx-auto">{firstFile.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Preview for PDF in Documents</p>
                    <Link href={`${basePath}/documents`} className="text-sm text-primary hover:underline mt-2 inline-block">
                      Open Documents
                    </Link>
                  </div>
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <p className="text-sm font-medium">No floorplan yet</p>
                    <p className="text-xs mt-1">Upload in Documents</p>
                    <Link href={`${basePath}/documents`} className="text-sm text-primary hover:underline mt-2 inline-block">
                      Upload level {level}
                    </Link>
                  </div>
                )}
              </div>
              {imageFile && (
                <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground truncate">
                  {imageFile.fileName}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Right: Action cards with counts */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Actions</h2>
        <ul className="space-y-3">
          <li>
            <Link
              href={`${basePath}/documents`}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold">Documents</span>
              {loading ? <span className="text-muted-foreground text-sm">…</span> : <span className="text-muted-foreground text-sm tabular-nums">{docsCount} doc{docsCount !== 1 ? 's' : ''}</span>}
            </Link>
          </li>
          <li>
            <Link
              href={`${basePath}/quantities`}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold">Quantities</span>
              {loading ? <span className="text-muted-foreground text-sm">…</span> : <span className="text-muted-foreground text-sm tabular-nums">{quantitiesCount} plan{quantitiesCount !== 1 ? 's' : ''}</span>}
            </Link>
          </li>
          <li>
            <Link
              href={`${basePath}/analyse`}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold">Analyse</span>
              {loading ? <span className="text-muted-foreground text-sm">…</span> : <span className="text-muted-foreground text-sm tabular-nums">{reportsCount} report{reportsCount !== 1 ? 's' : ''}</span>}
            </Link>
          </li>
          <li>
            <Link
              href={`${basePath}/chat`}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold">Chat</span>
              <span className="text-muted-foreground text-sm">AI</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
