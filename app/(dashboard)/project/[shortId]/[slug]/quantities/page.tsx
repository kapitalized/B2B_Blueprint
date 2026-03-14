'use client';

import { useProject } from '../ProjectProvider';
import { ProjectNav } from '../ProjectNav';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { formatDate } from '@/lib/format-date';

interface ReportRow {
  id: string;
  reportTitle: string;
  reportType: string;
  createdAt: string | null;
  runStartedAt?: string | null;
  runDurationMs?: number | null;
}

interface QuantityItem {
  label?: string;
  value?: number;
  unit?: string;
  area_m2?: number;
  volume_m3?: number;
}

export default function ProjectQuantitiesPage() {
  const params = useParams();
  const project = useProject();
  const shortId = params.shortId as string;
  const slug = params.slug as string;
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<{
    reportTitle: string;
    content_md?: string | null;
    data_payload: QuantityItem[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadReports = useCallback(() => {
    if (!project?.id) return;
    setLoading(true);
    fetch(`/api/projects/${project.id}/reports`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ReportRow[]) => {
        const list = Array.isArray(data) ? data : [];
        setReports(list.filter((r) => r.reportType === 'quantity_takeoff'));
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [project?.id]);

  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => {
    if (!selectedReportId) {
      setReportDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/reports/${selectedReportId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const payload = Array.isArray(data.data_payload) ? data.data_payload : [];
          setReportDetail({
            reportTitle: data.reportTitle ?? 'Quantity takeoff',
            content_md: data.content_md ?? data.content,
            data_payload: payload as QuantityItem[],
          });
        } else {
          setReportDetail(null);
        }
      })
      .catch(() => setReportDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedReportId]);

  if (!project) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <ProjectNav shortId={shortId} slug={slug} />
      <div>
        <h1 className="text-2xl font-bold">Quantities</h1>
        <p className="text-muted-foreground text-sm mt-1">Analysed output from floorplans and levels. Click a plan to view takeoff.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <section className="border rounded-lg bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Plans / levels</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Quantity takeoff reports</p>
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No quantity reports yet. Run analysis on a document from Documents.</div>
          ) : (
            <ul className="divide-y max-h-[60vh] overflow-y-auto">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(selectedReportId === r.id ? null : r.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${selectedReportId === r.id ? 'bg-primary/15 font-medium text-foreground' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}
                  >
                    <span className="block truncate font-medium">{r.reportTitle}</span>
                    {r.createdAt && (
                      <span className="block text-xs mt-0.5 opacity-80">
                        {formatDate(r.createdAt)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border rounded-lg bg-card overflow-hidden min-h-[200px]">
          {!selectedReportId ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Select a plan or level from the list to view quantities.</div>
          ) : loadingDetail ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : reportDetail ? (
            <div className="p-4">
              <h2 className="font-semibold text-lg mb-4">{reportDetail.reportTitle}</h2>
              {reportDetail.content_md && (
                <div className="mb-4 text-sm text-muted-foreground whitespace-pre-wrap border-b pb-4">{reportDetail.content_md}</div>
              )}
              {reportDetail.data_payload.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Item / label</th>
                        <th className="text-right p-3 font-medium">Value</th>
                        <th className="text-left p-3 font-medium">Unit</th>
                        {(reportDetail.data_payload.some((i) => i.area_m2 != null)) && <th className="text-right p-3 font-medium">Area (m²)</th>}
                        {(reportDetail.data_payload.some((i) => i.volume_m3 != null)) && <th className="text-right p-3 font-medium">Volume (m³)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {reportDetail.data_payload.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 font-medium">{item.label ?? '—'}</td>
                          <td className="p-3 text-right">{item.value != null ? String(item.value) : '—'}</td>
                          <td className="p-3 text-muted-foreground">{item.unit ?? '—'}</td>
                          {reportDetail.data_payload.some((i) => i.area_m2 != null) && <td className="p-3 text-right">{item.area_m2 != null ? item.area_m2 : '—'}</td>}
                          {reportDetail.data_payload.some((i) => i.volume_m3 != null) && <td className="p-3 text-right">{item.volume_m3 != null ? item.volume_m3 : '—'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No quantity items in this report.</p>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">Could not load report.</div>
          )}
        </section>
      </div>
    </div>
  );
}
