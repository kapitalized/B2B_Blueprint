/**
 * AI model selector for the 3-step pipeline (blueprint @04_ai_module_blueprint).
 * All models are used via OpenRouter (https://openrouter.ai).
 */

export const AI_STEPS = {
  EXTRACTION: 'google/gemini-2.0-flash-001',
  ANALYSIS: 'deepseek/deepseek-r1',
  SYNTHESIS: 'anthropic/claude-3.7-sonnet',
} as const;

export type AIStepKey = keyof typeof AI_STEPS;

export function getModelForStep(step: AIStepKey): string {
  return AI_STEPS[step];
}
