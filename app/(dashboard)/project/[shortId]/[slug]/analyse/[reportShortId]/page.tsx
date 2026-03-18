'use client';

import { useProject } from '../../ProjectProvider';
import { ProjectNav } from '../../ProjectNav';
import { AnalyseReportListContent } from '@/app/(dashboard)/dashboard/ai/analyse/AnalyseReportListContent';
import { useParams } from 'next/navigation';

export default function ProjectAnalyseReportPage() {
  const params = useParams();
  const project = useProject();
  const shortId = params.shortId as string;
  const slug = params.slug as string;
  const reportShortId = params.reportShortId as string;

  if (!project) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const basePath = `/project/${shortId}/${slug}/analyse`;
  return (
    <div className="space-y-4">
      <ProjectNav shortId={shortId} slug={slug} />
      <AnalyseReportListContent
        initialProjectId={project.id}
        basePath={basePath}
        initialReportShortId={reportShortId}
      />
    </div>
  );
}
