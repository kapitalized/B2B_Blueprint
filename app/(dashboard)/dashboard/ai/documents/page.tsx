'use client';

/**
 * AI Documents — project selector, upload, file list, Run analysis per file.
 */
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  projectName: string;
}

interface ProjectFile {
  id: string;
  fileName: string;
  fileType: string;
  blobUrl: string;
  fileSize?: number | null;
  uploadedAt?: string | null;
}

function AIDocumentsContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(projectIdParam ?? '');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (!projectId && list.length > 0) setProjectId(list[0].id);
        if (projectIdParam && list.some((p: Project) => p.id === projectIdParam)) setProjectId(projectIdParam);
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

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !projectId || uploading) return;
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Upload failed.');
        return;
      }
      loadFiles();
    } catch {
      setError('Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function runAnalysis(file: ProjectFile) {
    if (!projectId || analyzingId) return;
    setError(null);
    setAnalyzingId(file.id);
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Analysis failed.');
        return;
      }
      loadFiles();
    } catch {
      setError('Analysis failed.');
    } finally {
      setAnalyzingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload files, then run AI analysis. Results appear in Reports.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Project</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm w-full max-w-xs"
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.projectName}</option>
          ))}
        </select>
      </div>

      {projectId && (
        <>
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            <label className="cursor-pointer block">
              <span className="text-muted-foreground font-medium">
                {uploading ? 'Uploading…' : 'Drop files or click to upload'}
              </span>
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={onUpload}
                accept=".pdf,.png,.jpg,.jpeg,.webp"
              />
            </label>
          </div>

          <div className="border rounded-lg bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm">Uploaded files</h2>
              <Link href={`/dashboard/ai/reports?projectId=${projectId}`} className="text-sm text-primary hover:underline">
                View reports
              </Link>
            </div>
            {loadingFiles ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : files.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No files yet. Upload above.</div>
            ) : (
              <ul className="divide-y">
                {files.map((f) => (
                  <li key={f.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{f.fileName}</p>
                      <p className="text-xs text-muted-foreground">{f.fileType} {f.fileSize != null ? ` · ${(f.fileSize / 1024).toFixed(1)} KB` : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => runAnalysis(f)}
                      disabled={analyzingId !== null}
                      className="text-sm px-3 py-1.5 rounded-md border bg-primary text-primary-foreground disabled:opacity-50 shrink-0"
                    >
                      {analyzingId === f.id ? 'Running…' : 'Run analysis'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {!projectId && projects.length === 0 && (
        <p className="text-muted-foreground text-sm">Create a project from the Dashboard first.</p>
      )}
    </div>
  );
}

export default function AIDocumentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <AIDocumentsContent />
    </Suspense>
  );
}
