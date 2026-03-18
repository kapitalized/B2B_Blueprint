import type { IExternalApiAdapter } from '../types';

export interface GenericAdapterConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | object;
}

export const genericAdapter: IExternalApiAdapter = {
  key: 'generic',
  async run(config: unknown): Promise<{ status: 'success' | 'error'; recordsFetched?: number; errorMessage?: string; rawResult?: unknown }> {
    const c = config as GenericAdapterConfig;
    if (!c?.url) {
      return { status: 'error', errorMessage: 'config.url is required' };
    }
    try {
      const body = c.body != null ? (typeof c.body === 'string' ? c.body : JSON.stringify(c.body)) : undefined;
      const res = await fetch(c.url, {
        method: c.method ?? 'GET',
        headers: { 'Content-Type': 'application/json', ...c.headers },
        body,
      });
      if (!res.ok) {
        const text = await res.text();
        return {
          status: 'error',
          errorMessage: `HTTP ${res.status}: ${text.slice(0, 500)}`,
        };
      }
      const data = await res.json().catch(() => null);
      const count = Array.isArray(data) ? data.length : data?.data?.length ?? data?.items?.length ?? undefined;
      return {
        status: 'success',
        recordsFetched: typeof count === 'number' ? count : undefined,
        rawResult: Array.isArray(data) ? { count: data.length, sample: data.slice(0, 3) } : (data && typeof data === 'object' ? { keys: Object.keys(data) } : data),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { status: 'error', errorMessage: msg };
    }
  },
};
