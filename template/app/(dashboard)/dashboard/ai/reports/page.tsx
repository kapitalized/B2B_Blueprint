import AIReportViewer from '@/components/ai/AIReportViewer';

/**
 * AI Reports — list of reports + viewer. Wire to ai_tasks / pipeline results when DB exists.
 */
export default function AIReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pipeline results and human review queue. Run analysis from Documents, then open here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar: report list */}
        <aside className="lg:col-span-1 border rounded-lg bg-card p-4">
          <h2 className="font-semibold text-sm">Reports</h2>
          <p className="text-xs text-muted-foreground mt-1">List from ai_tasks when Supabase is connected.</p>
          <ul className="mt-4 space-y-2">
            <li className="text-sm text-muted-foreground">No reports yet</li>
          </ul>
        </aside>

        {/* Main: report viewer */}
        <div className="lg:col-span-2">
          <AIReportViewer
            report={{
              title: 'Sample report',
              content_md: 'Run the pipeline (Documents or `/api/ai/run`) to see real reports here.',
              data_payload: [],
              created_at: new Date().toISOString(),
            }}
          />
        </div>
      </div>
    </div>
  );
}
