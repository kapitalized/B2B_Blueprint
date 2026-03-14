'use client';

import { useEffect, useState } from 'react';

type Status = 'ok' | 'error' | 'unconfigured';

interface HealthStatus {
  app: 'ok';
  database: Status;
  model: Status;
}

const POLL_MS = 60_000;

export function HealthMonitor() {
  const [status, setStatus] = useState<HealthStatus | null>(null);

  useEffect(() => {
    function fetchStatus() {
      fetch('/api/health/status', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then(setStatus)
        .catch(() => setStatus(null));
    }

    fetchStatus();
    const t = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(t);
  }, []);

  if (!status) return null;

  function Pill({ label, value }: { label: string; value: Status }) {
    const color =
      value === 'ok'
        ? 'text-emerald-600 dark:text-emerald-400'
        : value === 'unconfigured'
          ? 'text-muted-foreground'
          : 'text-red-600 dark:text-red-400';
    const title =
      value === 'unconfigured' ? `${label}: not configured` : value === 'error' ? `${label}: error` : `${label}: ok`;
    return (
      <span className={`text-xs font-medium ${color}`} title={title}>
        {label} {value === 'ok' ? 'ok' : value === 'unconfigured' ? '—' : 'error'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-4 text-xs">
      <Pill label="App" value={status.app} />
      <span className="text-muted-foreground/50">|</span>
      <Pill label="Database" value={status.database} />
      <span className="text-muted-foreground/50">|</span>
      <Pill label="Model" value={status.model} />
    </div>
  );
}
