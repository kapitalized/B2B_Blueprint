'use client';

/**
 * AI Documents — project selector, upload, file list, Run analysis per file.
 */
import { useEffect, useState, useCallback } from 'react';
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
  buildingLevel?: number | null;
}

export interface AIDocumentsContentProps {
  initialProjectId?: string;
}

export function AIDocumentsContent({ initialProjectId }: AIDocumentsContentProps = {}) {
  const searchParams = useSearchParams();
  const projectIdParam = initialProjectId ?? searchParams.get('projectId');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(projectIdParam ?? '');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLevel, setUploadingLevel] = useState<number | null>(null);
  const [projectDetail, setProjectDetail] = useState<{ numberOfLevels: number } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragOverLevel, setDragOverLevel] = useState<number | null>(null);

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

  useEffect(() => {
    if (!projectId) return setProjectDetail(null);
    fetch(`/api/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => (p ? setProjectDetail({ numberOfLevels: p.numberOfLevels ?? 1 }) : setProjectDetail(null)))
      .catch(() => setProjectDetail(null));
  }, [projectId]);

  const numberOfLevels = projectDetail?.numberOfLevels ?? 1;

  async function uploadFile(file: File, level: number) {
    if (!projectId || uploading) return;
    setError(null);
    setUploading(true);
    setUploadingLevel(level);
    const form = new FormData();
    form.append('file', file);
    form.append('buildingLevel', String(level));
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
      setUploadingLevel(null);
    }
  }

  function onInputChange(level: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, level);
    e.target.value = '';
  }

  function onDragOverLevel(level: number, e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLevel(level);
  }

  function onDragLeaveLevel(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLevel(null);
  }

  function onDropLevel(level: number, e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLevel(null);
    const file = e.dataTransfer.files?.[0];
    if (file && projectId && !uploading) uploadFile(file, level);
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

      {!initialProjectId && (
        <div>
          <label className="block text-sm font-medium mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm w-full max-w-xs text-foreground"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.projectName}</option>
            ))}
          </select>
        </div>
      )}

      {projectId && (
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          {/* Left: Documents list */}
          <div className="border rounded-lg bg-card overflow-hidden min-w-0">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Documents</h2>
                <p className="text-sm text-muted-foreground mt-0.5">All uploaded files for this project</p>
              </div>
              {initialProjectId && (
                <Link href={`/dashboard/ai/reports?projectId=${projectId}`} className="text-sm text-primary hover:underline shrink-0">
                  View reports
                </Link>
              )}
            </div>
            {loadingFiles ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : files.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No documents yet. Upload a file in the panel on the right.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">File name</th>
                      <th className="text-left p-3 font-medium">Level</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Size</th>
                      <th className="text-left p-3 font-medium">Uploaded</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-medium truncate max-w-[200px]" title={f.fileName}>{f.fileName}</td>
                        <td className="p-3 text-muted-foreground">{f.buildingLevel != null ? `Level ${f.buildingLevel}` : '—'}</td>
                        <td className="p-3 text-muted-foreground">{f.fileType}</td>
                        <td className="p-3 text-muted-foreground">{f.fileSize != null ? `${(f.fileSize / 1024).toFixed(1)} KB` : '—'}</td>
                        <td className="p-3 text-muted-foreground">{f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : '—'}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => runAnalysis(f)}
                            disabled={analyzingId !== null}
                            className="text-sm px-3 py-1.5 rounded-md border bg-primary text-primary-foreground disabled:opacity-50"
                          >
                            {analyzingId === f.id ? 'Running…' : 'Run analysis'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Upload floorplan per level */}
          <div className="lg:max-w-[320px] space-y-4">
            <div>
              <h2 className="font-semibold text-lg mb-1">Upload floorplans</h2>
              <p className="text-sm text-muted-foreground">One per level. PDF or image. Then run analysis from the list.</p>
            </div>
            {Array.from({ length: numberOfLevels }, (_, i) => i + 1).map((level) => (
              <div key={level} className="border rounded-lg bg-card overflow-hidden p-4">
                <p className="text-sm font-medium mb-2">Floorplan level {level}</p>
                <div
                  role="button"
                  tabIndex={0}
                  onDragOver={(e) => onDragOverLevel(level, e)}
                  onDragLeave={onDragLeaveLevel}
                  onDrop={(e) => onDropLevel(level, e)}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${dragOverLevel === level ? 'bg-blue-500/15 border-blue-500 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400 dark:text-blue-300' : 'bg-muted/10 hover:bg-muted/20 border-muted-foreground/25'}`}
                >
                  <label className="cursor-pointer block">
                    <span className={`text-sm font-medium block ${dragOverLevel === level ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>
                      {uploading && uploadingLevel === level ? 'Uploading…' : dragOverLevel === level ? 'Drop to upload' : 'Drop file or click'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => onInputChange(level, e)}
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!projectId && projects.length === 0 && (
        <p className="text-muted-foreground text-sm">Create a project from the Dashboard first.</p>
      )}
    </div>
  );
}
