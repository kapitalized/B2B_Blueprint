'use client';

import { useState } from 'react';

/**
 * AI Documents — upload and list. Run pipeline per doc; link to Reports when done.
 */
export default function AIDocumentsPage() {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload PDFs, images, or spreadsheets. Run AI analysis; results appear in Reports.
        </p>
      </div>

      {/* Upload zone */}
      <div
        className="border-2 border-dashed rounded-xl p-12 text-center bg-muted/10 hover:bg-muted/20 transition-colors cursor-not-allowed"
        aria-hidden
      >
        <p className="text-muted-foreground font-medium">Drop files or click to upload</p>
        <p className="text-xs text-muted-foreground mt-2">
          Wire to Supabase Storage (documents bucket) and pipeline trigger. Not connected yet.
        </p>
      </div>

      {/* Document list */}
      <div className="border rounded-lg bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Uploaded documents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">From Storage when configured.</p>
        </div>
        <div className="p-8 text-center text-sm text-muted-foreground">
          No documents yet. Upload will appear here once Storage and ingest are wired.
        </div>
      </div>
    </div>
  );
}
