/**
 * Admin: get and update AI model selection (OpenRouter model ids per step).
 * Allowed: dashboard session OR Payload admin (for /admin UI).
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { getAIModelConfig, setAIModelConfig } from '@/lib/ai/model-config';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const config = await getAIModelConfig();
    return NextResponse.json(config);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load AI model config' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await allowAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, string> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const config = {
    extraction: typeof body.extraction === 'string' ? body.extraction.trim() : undefined,
    analysis: typeof body.analysis === 'string' ? body.analysis.trim() : undefined,
    synthesis: typeof body.synthesis === 'string' ? body.synthesis.trim() : undefined,
    chat: typeof body.chat === 'string' ? body.chat.trim() : undefined,
  };

  if (!config.extraction && !config.analysis && !config.synthesis && !config.chat) {
    return NextResponse.json({ error: 'Provide at least one model to update' }, { status: 400 });
  }

  try {
    const updated = await setAIModelConfig(config);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to save AI model config' }, { status: 500 });
  }
}
