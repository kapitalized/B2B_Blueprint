'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDateTime } from '@/lib/format-date';

interface FileRow {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  uploadedAt: string | null;
  blobUrl: string | null;
  projectName: string;
  projectShortId: string | null;
}

export function FilesView() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/files?limit=100', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then(setFiles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/files/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error || 'Delete failed');
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  function formatSize(bytes: number | null) {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Files</h1>
      <p className="mt-1 text-sm text-muted-foreground">Project files (uploads) from the database.</p>
      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">File name</th>
              <th className="p-2 text-left font-medium">Type</th>
              <th className="p-2 text-right font-medium">Size</th>
              <th className="p-2 text-left font-medium">Project</th>
              <th className="p-2 text-left font-medium">Uploaded</th>
              <th className="p-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No files.</td></tr>
            ) : (
              files.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="p-2">{f.fileName}</td>
                  <td className="p-2">{f.fileType}</td>
                  <td className="p-2 text-right">{formatSize(f.fileSize)}</td>
                  <td className="p-2">{f.projectName} {f.projectShortId ? `(${f.projectShortId})` : ''}</td>
                  <td className="p-2">{f.uploadedAt ? formatDateTime(f.uploadedAt) : '—'}</td>
                  <td className="p-2">
                    {f.blobUrl && (
                      <a href={f.blobUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline mr-2">View</a>
                    )}
                    <button type="button" className="text-destructive hover:underline" onClick={() => handleDelete(f.id, f.fileName)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
