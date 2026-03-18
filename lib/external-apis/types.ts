/**
 * Types for the external APIs module. Add new adapters in adapters/ and register in registry.
 */

export type RunStatus = 'success' | 'error' | 'running';

export interface AdapterRunResult {
  status: RunStatus;
  recordsFetched?: number;
  errorMessage?: string;
  rawResult?: unknown;
}

export interface IExternalApiAdapter {
  /** Unique key (e.g. "generic"). */
  key: string;
  /** Run the adapter with the given config (from ApiSource.config). */
  run(config: unknown): Promise<AdapterRunResult>;
}
