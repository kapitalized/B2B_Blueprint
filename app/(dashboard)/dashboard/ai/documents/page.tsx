import { Suspense } from 'react';
import { AIDocumentsContent } from './AIDocumentsContent';

export default function AIDocumentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <AIDocumentsContent />
    </Suspense>
  );
}
