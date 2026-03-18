'use client';

/**
 * Analyse — list by project, select one, view in AIReportViewer.
 * When basePath is set (project-scoped URL), selection uses short URLs e.g. /project/x/y/analyse/ab12cd.
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AIReportViewer, { type ReportForViewer } from '@/components/ai/AIReportViewer';
import { formatDate, formatDateTime } from '@/lib/format-date';

interface Project {
  id: string;
  projectName: string;
}

interface ReportListItem {
  id: string;
  shortId: string | null;
  reportTitle: string;
  reportType: string;
  createdAt: string | null;
  runStartedAt: string | null;
  runDurationMs: number | null;
}

export interface AnalyseReportListContentProps {
  initialProjectId?: string;
  /** When set, selecting a report navigates to basePath/reportShortId (short URL). */
  basePath?: string;
  /** Initial report to select by short ID (from URL segment). */
  initialReportShortId?: string;
}

export function AnalyseReportListContent({ initialProjectId, basePath, initialReportShortId }: AnalyseReportListContentProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = initialProjectId ?? searchParams.get('projectId');
  const reportIdParam = searchParams.get('reportId');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(projectIdParam ?? '');
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(reportIdParam ?? null);
  const [report, setReport] = useState<ReportForViewer | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    if (reportIdParam && projectId) setSelectedId(reportIdParam);
  }, [reportIdParam, projectId]);

  useEffect(() => {
    if (!projectIdParam || !reportIdParam || basePath) return;
    let cancelled = false;
    fetch(`/api/redirect-report-url?projectId=${encodeURIComponent(projectIdParam)}&reportId=${encodeURIComponent(reportIdParam)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { url?: string } | null) => {
        if (!cancelled && data?.url) router.replace(data.url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectIdParam, reportIdParam, basePath, router]);

  useEffect(() => {
    if (!initialReportShortId || !reports.length || selectedId) return;
    const match = reports.find((r) => r.shortId === initialReportShortId);
    if (match) setSelectedId(match.id);
  }, [initialReportShortId, reports, selectedId]);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (initialProjectId) setProjectId(initialProjectId);
        else if (!projectId && list.length > 0) setProjectId(list[0].id);
        else if (projectIdParam && list.some((p: Project) => p.id === projectIdParam)) setProjectId(projectIdParam);
      })
      .catch(() => setProjects([]));
  }, [projectIdParam, initialProjectId]);

  const loadReports = useCallback(() => {
    if (!projectId) return setReports([]);
    setLoadingList(true);
    fetch(`/api/projects/${projectId}/reports`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setReports(Array.isArray(data) ? data : []); })
      .catch(() => setReports([]))
      .finally(() => setLoadingList(false));
  }, [projectId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => {
    if (!selectedId) return setReport(null);
    setLoadingReport(true);
    fetch(`/api/reports/${selectedId}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoadingReport(false));
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analyse</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pipeline results. Run analysis from Documents or the Analyse page, then open here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 border rounded-lg bg-card p-4 space-y-3">
          {!initialProjectId && (
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <select
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setSelectedId(null); }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>
            </div>
          )}
          <h2 className="font-semibold text-sm">Previous reports</h2>
          {loadingList ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reports yet.</p>
          ) : (
            <ul className="space-y-1">
              {reports.map((r) => {
                const runAt = r.runStartedAt ? new Date(r.runStartedAt) : null;
                const runLabel = runAt ? formatDateTime(runAt) : r.createdAt ? formatDate(r.createdAt) : null;
                const durationLabel = r.runDurationMs != null ? `${(r.runDurationMs / 1000).toFixed(1)}s` : null;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (basePath && r.shortId) {
                          router.push(`${basePath}/${r.shortId}`);
                        } else {
                          setSelectedId(r.id);
                        }
                      }}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded ${selectedId === r.id ? 'bg-primary/20' : 'hover:bg-muted'}`}
                    >
                      <span
                        className="block font-medium break-words"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        title={r.reportTitle}
                      >
                        {r.reportTitle}
                      </span>
                      {(runLabel || durationLabel) && (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {[runLabel, durationLabel].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
        <div className="lg:col-span-2">
          <AIReportViewer report={report} isLoading={loadingReport} />
        </div>
      </div>
    </div>
  );
}
