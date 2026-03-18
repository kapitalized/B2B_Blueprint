import type { IExternalApiAdapter } from './types';
import { genericAdapter } from './adapters/generic';

const adapters = new Map<string, IExternalApiAdapter>([
  [genericAdapter.key, genericAdapter],
]);

/** Register an adapter. Call from adapters/* and import in a central init if needed. */
export function registerAdapter(adapter: IExternalApiAdapter): void {
  adapters.set(adapter.key, adapter);
}

/** Get adapter by key. Returns undefined if not found. */
export function getAdapter(key: string): IExternalApiAdapter | undefined {
  return adapters.get(key);
}

/** List all registered adapter keys. */
export function listAdapterKeys(): string[] {
  return Array.from(adapters.keys());
}
