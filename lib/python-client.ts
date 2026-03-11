/**
 * Server-side bridge to the FastAPI Math Engine. See blueprint @17_python_client.
 * When PYTHON_ENGINE_URL is not set (e.g. on Vercel), runs the same logic in-app so no separate server is needed.
 */

import { runCalculate } from '@/lib/calculate-engine';

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL;
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

export interface PythonEngineResponse<T = unknown> {
  status: 'success' | 'error';
  results?: T;
  detail?: string;
  metadata?: {
    processing_time?: string;
    engine?: string;
    [key: string]: unknown;
  };
}

export async function callPythonEngine<T = unknown>(
  endpoint: string,
  payload: { data: unknown[]; parameters: Record<string, unknown> }
): Promise<PythonEngineResponse<T>> {
  const data = Array.isArray(payload.data) ? payload.data : [];
  const parameters = payload.parameters ?? { thickness: 0.2 };

  if (!PYTHON_ENGINE_URL || PYTHON_ENGINE_URL.trim() === '') {
    const result = runCalculate({ data, parameters });
    return result as unknown as PythonEngineResponse<T>;
  }

  if (!INTERNAL_SERVICE_KEY) {
    console.error('CRITICAL: INTERNAL_SERVICE_KEY is missing.');
    throw new Error('Internal Configuration Error');
  }

  const path = endpoint.replace(/^\//, '');
  const url = `${PYTHON_ENGINE_URL.replace(/\/$/, '')}/${path}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': INTERNAL_SERVICE_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(errorBody.detail ?? `Python Engine returned ${response.status}`);
    }

    return (await response.json()) as PythonEngineResponse<T>;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to communicate with Math Engine.';
    console.error(`Connection failure to ${url}:`, message);
    throw new Error('Failed to communicate with Math Engine. Please check service status.');
  }
}
