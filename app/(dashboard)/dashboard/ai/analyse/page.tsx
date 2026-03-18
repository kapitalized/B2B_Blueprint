'use client';

/**
 * Analyse — select floorplan, run analysis (top card); below: Previous reports (left), Report viewer (right).
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AIReportViewer, { type ReportForViewer } from '@/components/ai/AIReportViewer';
import { formatDate, formatDateTime } from '@/lib/format-date';

interface Project {
  id: string;
  projectName: string;
}

interface ProjectFile {
  id: string;
  fileName: string;
  fileType: string;
  blobUrl: string;
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

export default function AnalysePage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const reportIdParam = searchParams.get('reportId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(projectIdParam ?? '');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const [analyseSuccess, setAnalyseSuccess] = useState<string | null>(null);

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(reportIdParam ?? null);
  const [report, setReport] = useState<ReportForViewer | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (projectIdParam && list.some((p: Project) => p.id === projectIdParam)) setProjectId(projectIdParam);
        else if (!projectId && list.length > 0) setProjectId(list[0].id);
      })
      .catch(() => setProjects([]));
  }, [projectIdParam]);

  const loadFiles = useCallback(() => {
    if (!projectId) return setFiles([]);
    setLoadingFiles(true);
    fetch(`/api/projects/${projectId}/files`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFiles(Array.isArray(data) ? data : []))
      .catch(() => setFiles([]))
      .finally(() => setLoadingFiles(false));
  }, [projectId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => { setSelectedFileId(''); }, [projectId]);

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

  useEffect(() => {
    if (reportIdParam && projectId) setSelectedId(reportIdParam);
  }, [reportIdParam, projectId]);

  async function runAnalysis() {
    if (!projectId || !selectedFileId || analyzing) return;
    const file = files.find((f) => f.id === selectedFileId);
    if (!file?.blobUrl) return;
    setAnalyseError(null);
    setAnalyseSuccess(null);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          fileId: file.id,
          fileUrl: file.blobUrl,
          sourceContent: `File: ${file.fileName}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const apiError = (data as { error?: string }).error;

      if (!res.ok) {
        setAnalyseError(apiError ?? 'Analysis failed.');
        return;
      }
      if (apiError) {
        setAnalyseError(apiError);
        return;
      }
      const reportId = (data as { reportId?: string }).reportId ?? (data as { persisted?: { reportId?: string } }).persisted?.reportId;
      if (reportId) {
        setAnalyseSuccess('Analysis complete. Report added below.');
        loadReports();
        setSelectedId(reportId);
      } else {
        setAnalyseError('Analysis completed but no report was created.');
      }
    } catch {
      setAnalyseError('Network or server error. Try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analyse</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Select a floorplan and run AI analysis. View previous reports and open any report in the viewer.
      </p>

      {/* Top card: Select floorplan, click to analyse */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold text-sm mb-3">Run analysis</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px] text-foreground"
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Floorplan</label>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              disabled={!projectId || loadingFiles}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px] text-foreground disabled:opacity-50"
            >
              <option value="">Select file</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>{f.fileName}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={!projectId || !selectedFileId || analyzing || loadingFiles}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
        {analyseError && (
          <p className="mt-2 text-sm text-destructive">{analyseError}</p>
        )}
        {analyseSuccess && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">{analyseSuccess}</p>
        )}
      </div>

      {/* Two columns: Previous reports (left), Report viewer (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 border rounded-lg bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Previous reports</h2>
          {loadingList ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reports yet. Run analysis above.</p>
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
