'use client';

export default function PayloadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 640 }}>
      <h1>Admin error</h1>
      <pre style={{ background: '#f5f5f5', padding: 16, overflow: 'auto', fontSize: 14 }}>
        {error?.message ?? 'Unknown error'}
      </pre>
      <p style={{ color: '#666' }}>
        Often caused by a missing or invalid <strong>DATABASE_URI</strong> (Postgres). Set it in .env.local and restart.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{ padding: '8px 16px', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  );
}
