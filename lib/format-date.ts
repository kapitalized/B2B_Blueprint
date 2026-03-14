/**
 * Shared date formatting: "30 Mar 2026" and "30 Mar 2026, 14:30".
 */

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
};

/** Format as "30 Mar 2026". */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (date == null) return '—';
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, DATE_OPTIONS);
}

/** Format as "30 Mar 2026, 14:30". */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (date == null) return '—';
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, DATE_TIME_OPTIONS);
}
