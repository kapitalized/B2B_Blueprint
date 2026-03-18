/**
 * Run a single API source by ID. Uses Payload to read source and write run record.
 */
import { getPayload } from 'payload';
import config from '@payload-config';
import { getAdapter } from './registry';
import type { AdapterRunResult } from './types';

const RUN_COLLECTION = 'external-api-runs';
const SOURCES_COLLECTION = 'api-sources';

export interface RunExternalApiResult {
  runId: string;
  status: string;
  errorMessage?: string;
  recordsFetched?: number;
}

export async function runApiSource(sourceId: string): Promise<RunExternalApiResult> {
  const resolvedConfig = typeof config.then === 'function' ? await config : config;
  const payload = await getPayload({ config: resolvedConfig });

  const source = await payload.findByID({
    collection: SOURCES_COLLECTION,
    id: sourceId,
  });
  if (!source) {
    return { runId: '', status: 'error', errorMessage: 'Source not found' };
  }
  const enabled = (source as { enabled?: boolean }).enabled;
  if (enabled === false) {
    return { runId: '', status: 'error', errorMessage: 'Source is disabled' };
  }

  const adapterKey = (source as { adapter?: string }).adapter ?? 'generic';
  const adapter = getAdapter(adapterKey);
  if (!adapter) {
    return { runId: '', status: 'error', errorMessage: `Unknown adapter: ${adapterKey}` };
  }

  const configJson = (source as { config?: unknown }).config;
  const startedAt = new Date();

  const runDoc = await payload.create({
    collection: RUN_COLLECTION,
    data: {
      source: sourceId,
      startedAt: startedAt.toISOString(),
      status: 'running',
    },
  });
  const runId = String(runDoc.id);

  let result: AdapterRunResult;
  try {
    result = await adapter.run(configJson);
  } catch (e) {
    result = {
      status: 'error',
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }

  const finishedAt = new Date();
  await payload.update({
    collection: RUN_COLLECTION,
    id: runDoc.id,
    data: {
      finishedAt: finishedAt.toISOString(),
      status: result.status,
      recordsFetched: result.recordsFetched ?? null,
      errorMessage: result.errorMessage ?? null,
      rawResult: result.rawResult ?? null,
    },
  });

  await payload.update({
    collection: SOURCES_COLLECTION,
    id: sourceId,
    data: { lastRunAt: finishedAt.toISOString() },
  });

  return {
    runId,
    status: result.status,
    errorMessage: result.errorMessage,
    recordsFetched: result.recordsFetched,
  };
}

/** Run all enabled API sources. Returns one result per source. */
export async function runAllEnabledSources(): Promise<RunExternalApiResult[]> {
  const resolvedConfig = typeof config.then === 'function' ? await config : config;
  const payload = await getPayload({ config: resolvedConfig });
  const result = await payload.find({
    collection: SOURCES_COLLECTION,
    where: { enabled: { equals: true } },
    limit: 50,
  });
  const out: RunExternalApiResult[] = [];
  for (const doc of result.docs) {
    const id = String(doc.id);
    const r = await runApiSource(id);
    out.push({ ...r, runId: r.runId || id });
  }
  return out;
}
