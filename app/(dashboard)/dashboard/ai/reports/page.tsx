import { Suspense } from 'react';
import { AIReportsContent } from './AIReportsContent';

export default function AIReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <AIReportsContent />
    </Suspense>
  );
}
