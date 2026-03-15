/**
 * GET: Verify whether the app will use the Hugging Face floorplan model for extraction.
 * Returns hfConfigured (same logic as the pipeline) and model ID.
 * Use this to confirm .env.local is loaded and HF will be tried first for plan images.
 */

import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isHFExtractionConfigured } from '@/lib/ai/floorplan-extraction';

import { HF_MODEL_ID } from '@/lib/ai/floorplan-extraction-hf';

export async function GET() {
  const session = await getSessionForApi();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hfConfigured = isHFExtractionConfigured();
  const tokenSet = Boolean(
    (process.env.HUGGINGFACE_HUB_TOKEN ?? process.env.HF_TOKEN)?.trim()
  );

  return NextResponse.json({
    ok: true,
    hfConfigured,
    hfTokenSet: tokenSet,
    modelId: HF_MODEL_ID,
    message: hfConfigured
      ? `Floorplan extraction will use Hugging Face model "${HF_MODEL_ID}" first; on API error, fallback to OpenRouter.`
      : tokenSet
        ? 'Token is set but USE_HF_FLOORPLAN_EXTRACTION may be false.'
        : 'Set HUGGINGFACE_HUB_TOKEN (or HF_TOKEN) in .env.local and restart the server to use the HF model.',
  });
}
