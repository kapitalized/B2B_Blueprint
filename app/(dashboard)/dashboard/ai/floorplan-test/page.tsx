'use client';

/**
 * Floorplan workflow test page. Run the pipeline with a chosen plan and see
 * extraction labels, overlay box count, and report payload. Results are also
 * written to docs/Testing/floorplan-test-result.json so Cursor can read them.
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  projectName: string;
}

interface ProjectFile {
  id: string;
  fileName: string;
}

interface TestResult {
  ranAt: string;
  projectId: string;
  fileId: string;
  reportId: string;
  reportShortId: string | null;
  extractionProvider?: 'huggingface' | 'openrouter';
  extractionLabels: string[];
  overlayItemsCount: number;
  reportPayloadLabels: string[];
  reportPayloadValues: number[];
  reportPayloadLengths?: (number | undefined)[];
  reportPayloadWidths?: (number | undefined)[];
  stepTrace: Array<{ step: string; stepLabel?: string; model: string; error?: string }>;
  errors: string[];
}

export default function FloorplanTestPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fileId, setFileId] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [reportShortId, setReportShortId] = useState<string | null>(null);
  const [extractionMode, setExtractionMode] = useState<'single-pass' | 'multilook' | null>(null);
  const [hfConfigured, setHfConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (!projectId && list.length > 0) setProjectId(list[0].id);
      })
      .catch(() => setProjects([]));
  }, []);

  const loadFiles = useCallback(() => {
    if (!projectId) return setFiles([]);
    setLoadingFiles(true);
    fetch(`/api/projects/${projectId}/files`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setFiles(list);
        if (!list.some((f: ProjectFile) => f.id === fileId)) setFileId(list[0]?.id ?? '');
      })
      .catch(() => setFiles([]))
      .finally(() => setLoadingFiles(false));
  }, [projectId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    fetch('/api/ai/test-floorplan')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { extractionMode?: string; hfConfigured?: boolean } | null) => {
        const mode = data?.extractionMode === 'multilook' ? 'multilook' : 'single-pass';
        setExtractionMode(mode);
        setHfConfigured(data?.hfConfigured ?? false);
      })
      .catch(() => setExtractionMode('single-pass'));
  }, []);

  async function runTest() {
    if (!projectId || !fileId) {
      setError('Select a project and a file.');
      return;
    }
    setError(null);
    setResult(null);
    setReportShortId(null);
    setRunning(true);
    try {
      const res = await fetch('/api/ai/test-floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, fileId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Test failed');
        return;
      }
      const tr = (data as { testResult?: TestResult }).testResult;
      if (tr) {
        setResult(tr);
        setReportShortId(tr.reportShortId ?? (data as { reportShortId?: string | null }).reportShortId ?? null);
      }
    } catch {
      setError('Request failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Floorplan workflow test</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Run the extraction → overlay → report pipeline with one plan. Results are shown below and written to{' '}
          <code className="rounded bg-muted px-1">docs/Testing/floorplan-test-result.json</code> so Cursor can inspect them.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="font-semibold">1. Select plan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Project</label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">File (floorplan)</label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              disabled={loadingFiles || !projectId}
            >
              <option value="">Select file</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>{f.fileName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runTest}
            disabled={running || !projectId || !fileId}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run floorplan test'}
          </button>
          <Link href="/dashboard/ai/documents" className="text-sm text-muted-foreground hover:underline">
            Upload a file
          </Link>
          {extractionMode != null && (
            <span className="text-xs text-muted-foreground ml-auto">
              Extraction: <strong>{extractionMode === 'multilook' ? 'Multilook (review pass)' : 'Single-pass'}</strong>
              {extractionMode === 'multilook' && ' (ENABLE_EXTRACTION_REVIEW_PASS=true)'}
              {' · '}
              HF: <strong>{hfConfigured === true ? 'configured' : hfConfigured === false ? 'not configured' : '…'}</strong>
              {hfConfigured === false && ' (add HUGGINGFACE_HUB_TOKEN to .env.local and restart)'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h2 className="font-semibold">2. Test result</h2>
          {(result.reportId || reportShortId) && (
            <p className="text-sm">
              <Link
                href={`/dashboard/ai/analyse?projectId=${result.projectId}&reportId=${result.reportId}`}
                className="text-primary underline hover:no-underline"
              >
                Open report
              </Link>
            </p>
          )}
          <dl className="grid gap-2 text-sm">
            {result.extractionProvider && (
              <>
                <dt className="font-medium text-muted-foreground">Extraction provider</dt>
                <dd><strong>{result.extractionProvider === 'huggingface' ? 'Hugging Face' : 'OpenRouter'}</strong></dd>
              </>
            )}
            <dt className="font-medium text-muted-foreground">Extraction labels</dt>
            <dd className="font-mono text-xs break-all">{result.extractionLabels.length ? result.extractionLabels.join(', ') : '(none)'}</dd>
            <dt className="font-medium text-muted-foreground">Overlay boxes</dt>
            <dd>{result.overlayItemsCount} {result.overlayItemsCount === 0 ? '— no boxes drawn' : ''}</dd>
            <dt className="font-medium text-muted-foreground">Report labels</dt>
            <dd className="font-mono text-xs break-all">{result.reportPayloadLabels.length ? result.reportPayloadLabels.join(', ') : '(none)'}</dd>
            <dt className="font-medium text-muted-foreground">Report values (m²)</dt>
            <dd className="font-mono text-xs">{result.reportPayloadValues.join(', ')}</dd>
            {result.reportPayloadLengths?.some((v) => v != null) && (
              <>
                <dt className="font-medium text-muted-foreground">Report lengths (m)</dt>
                <dd className="font-mono text-xs">{result.reportPayloadLengths.map((v) => (v != null ? v : '—')).join(', ')}</dd>
              </>
            )}
            {result.reportPayloadWidths?.some((v) => v != null) && (
              <>
                <dt className="font-medium text-muted-foreground">Report widths (m)</dt>
                <dd className="font-mono text-xs">{result.reportPayloadWidths.map((v) => (v != null ? v : '—')).join(', ')}</dd>
              </>
            )}
          </dl>
          {result.errors.length > 0 && (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Detected issues</p>
              <ul className="list-disc list-inside mt-1 text-amber-700 dark:text-amber-300">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Full result written to <code>docs/Testing/floorplan-test-result.json</code>. Use the fix list in <code>docs/Floorplan_Workflow_Fix_List.md</code> to address issues.
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Fix list</p>
        <p className="mt-1">
          See <code className="rounded bg-muted px-1">docs/Floorplan_Workflow_Fix_List.md</code> for a stepwise list of items to fix: boundary boxes, image analysis, and report labels/values.
        </p>
      </div>
    </div>
  );
}
