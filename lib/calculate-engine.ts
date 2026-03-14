/**
 * In-app implementation of the Python engine's /calculate logic.
 * Used when PYTHON_ENGINE_URL is not set (e.g. on Vercel) so everything runs in one deployment.
 */

export interface CalculatePayload {
  data: unknown[];
  parameters: Record<string, unknown>;
}

export interface CalculateResult {
  status: 'success';
  results: Array<{
    id?: string;
    label: string;
    area_m2: number;
    volume_m3: number;
    verified: boolean;
  }>;
  metadata: {
    items_processed: number;
    applied_thickness: number;
  };
}

export function runCalculate(payload: CalculatePayload): CalculateResult {
  const thickness = Number(payload.parameters?.thickness ?? 0.2);
  const results = payload.data.map((el) => {
    const item = el as Record<string, unknown>;
    const area = Number(item?.area ?? 0);
    const volume = area * thickness;
    return {
      id: item?.id as string | undefined,
      label: (item?.label as string)?.trim() || (item?.id as string) || 'Unknown Component',
      area_m2: Math.round(area * 100) / 100,
      volume_m3: Math.round(volume * 100) / 100,
      verified: true,
    };
  });
  return {
    status: 'success',
    results,
    metadata: {
      items_processed: results.length,
      applied_thickness: thickness,
    },
  };
}
