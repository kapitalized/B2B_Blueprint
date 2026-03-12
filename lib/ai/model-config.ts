/**
 * Admin-configurable AI model selection. Reads from DB (ai_model_config); falls back to defaults when no row.
 */

import { db } from '@/lib/db';
import { ai_model_config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AI_STEPS } from './model-selector';

const DEFAULT_CHAT_MODEL = 'openai/gpt-4o-mini';

export interface AIModelConfig {
  extraction: string;
  analysis: string;
  synthesis: string;
  chat: string;
}

const defaults: AIModelConfig = {
  extraction: AI_STEPS.EXTRACTION,
  analysis: AI_STEPS.ANALYSIS,
  synthesis: AI_STEPS.SYNTHESIS,
  chat: DEFAULT_CHAT_MODEL,
};

export async function getAIModelConfig(): Promise<AIModelConfig> {
  try {
    const [row] = await db
      .select()
      .from(ai_model_config)
      .where(eq(ai_model_config.id, 1))
      .limit(1);
    if (row) {
      return {
        extraction: row.extraction_model ?? defaults.extraction,
        analysis: row.analysis_model ?? defaults.analysis,
        synthesis: row.synthesis_model ?? defaults.synthesis,
        chat: row.chat_model ?? defaults.chat,
      };
    }
  } catch {
    // DB not migrated or unavailable
  }
  return { ...defaults };
}

export async function setAIModelConfig(config: Partial<AIModelConfig>): Promise<AIModelConfig> {
  const current = await getAIModelConfig();
  const next: AIModelConfig = {
    extraction: config.extraction ?? current.extraction,
    analysis: config.analysis ?? current.analysis,
    synthesis: config.synthesis ?? current.synthesis,
    chat: config.chat ?? current.chat,
  };
  try {
    await db
      .insert(ai_model_config)
      .values({
        id: 1,
        extraction_model: next.extraction,
        analysis_model: next.analysis,
        synthesis_model: next.synthesis,
        chat_model: next.chat,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: ai_model_config.id,
        set: {
          extraction_model: next.extraction,
          analysis_model: next.analysis,
          synthesis_model: next.synthesis,
          chat_model: next.chat,
          updated_at: new Date(),
        },
      });
  } catch {
    throw new Error('Failed to save AI model config');
  }
  return next;
}
