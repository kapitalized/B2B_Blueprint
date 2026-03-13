'use client';

/**
 * AI Reports — list by project, select one, view in AIReportViewer.
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AIReportViewer, { type ReportForViewer } from '@/components/ai/AIReportViewer';

interface Project {
  id: string;
  projectName: string;
}

interface ReportListItem {
  id: string;
  reportTitle: string;
  reportType: string;
  createdAt: string | null;
  runStartedAt: string | null;
  runDurationMs: number | null;
}

export interface AIReportsContentProps {
  initialProjectId?: string;
}

export function AIReportsContent({ initialProjectId }: AIReportsContentProps = {}) {
  const searchParams = useSearchParams();
  const projectIdParam = initialProjectId ?? searchParams.get('projectId');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(projectIdParam ?? '');
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<ReportForViewer | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

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
          <h1 className="text-2xl font-bold">AI Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pipeline results. Run analysis from Documents, then open here.
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
          <h2 className="font-semibold text-sm">Reports</h2>
          {loadingList ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reports yet.</p>
          ) : (
            <ul className="space-y-1">
              {reports.map((r) => {
                const runAt = r.runStartedAt ? new Date(r.runStartedAt) : null;
                const runLabel = runAt
                  ? `${runAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} ${runAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                  : r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                    : null;
                const durationLabel = r.runDurationMs != null ? `${(r.runDurationMs / 1000).toFixed(1)}s` : null;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded ${selectedId === r.id ? 'bg-primary/20' : 'hover:bg-muted'}`}
                    >
                      <span className="block font-medium truncate">{r.reportTitle}</span>
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
