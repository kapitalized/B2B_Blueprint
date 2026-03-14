/**
 * Citation audit: cross-verify analysis results against benchmarks (blueprint §2).
 * If a result deviates from the Knowledge Library benchmark by >15%, flag CRITICAL_WARNING.
 */

export interface AuditItem {
  id: string;
  label: string;
  value: number;
  unit?: string;
  citation_id?: string;
  coordinate_set?: unknown;
  /** Confidence 0–1 from extraction (e.g. room detection). Shown in report when present. */
  confidence_score?: number;
  /** Length in meters (dimension from plan). Used with width_m to explain area. */
  length_m?: number;
  /** Width in meters (dimension from plan). Used with length_m to explain area. */
  width_m?: number;
}

export interface Benchmark {
  key: string;
  value: number;
  unit?: string;
}

export interface CitationAuditResult {
  items: AuditItem[];
  warnings: Array<{
    itemId: string;
    label: string;
    deviation: number;
    message: string;
  }>;
  criticalWarnings: Array<{
    itemId: string;
    label: string;
    deviation: number;
    message: string;
  }>;
}

const DEVIATION_THRESHOLD = 0.15; // 15%

/**
 * Compare analysis items to benchmarks. Flags items that deviate by more than 15%.
 */
export function runCitationAudit(
  items: AuditItem[],
  benchmarks: Benchmark[]
): CitationAuditResult {
  const benchmarkMap = new Map(benchmarks.map((b) => [b.key, b]));
  const warnings: CitationAuditResult['warnings'] = [];
  const criticalWarnings: CitationAuditResult['criticalWarnings'] = [];

  for (const item of items) {
    const benchmark = benchmarkMap.get(item.id) ?? benchmarkMap.get(item.label);
    if (benchmark == null) continue;

    const expected = benchmark.value;
    if (expected === 0) continue;

    const deviation = Math.abs(item.value - expected) / expected;
    const message = `Expected ~${expected} ${benchmark.unit ?? ''}, got ${item.value} (${(deviation * 100).toFixed(1)}% deviation)`;

    if (deviation > DEVIATION_THRESHOLD) {
      criticalWarnings.push({ itemId: item.id, label: item.label, deviation, message });
    } else if (deviation > DEVIATION_THRESHOLD * 0.5) {
      warnings.push({ itemId: item.id, label: item.label, deviation, message });
    }
  }

  return { items, warnings, criticalWarnings };
}
