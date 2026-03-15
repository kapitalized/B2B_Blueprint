/**
 * Curated OpenRouter model options for admin dropdowns.
 * See https://openrouter.ai/models for full list.
 */
export interface OpenRouterModelOption {
  id: string;
  label: string;
  /** Vision-capable (for extraction from images) */
  vision?: boolean;
}

export const OPENROUTER_MODEL_OPTIONS: OpenRouterModelOption[] = [
  // Google
  { id: 'google/gemini-2.0-flash-001', label: 'Google Gemini 2.0 Flash', vision: true },
  { id: 'google/gemini-2.0-flash-exp', label: 'Google Gemini 2.0 Flash (experimental)', vision: true },
  { id: 'google/gemini-flash-1.5', label: 'Google Gemini 1.5 Flash', vision: true },
  { id: 'google/gemini-pro-1.5', label: 'Google Gemini 1.5 Pro', vision: true },
  // OpenAI
  { id: 'openai/gpt-4o', label: 'OpenAI GPT-4o', vision: true },
  { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini', vision: true },
  { id: 'openai/gpt-4o-2024-11-20', label: 'OpenAI GPT-4o (Nov 2024)', vision: true },
  // Anthropic
  { id: 'anthropic/claude-3.7-sonnet', label: 'Anthropic Claude 3.7 Sonnet', vision: true },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Anthropic Claude 3.5 Sonnet', vision: true },
  { id: 'anthropic/claude-3-haiku', label: 'Anthropic Claude 3 Haiku', vision: true },
  // DeepSeek (reasoning, cost-effective)
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (reasoning)', vision: false },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', vision: false },
  // Meta
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta Llama 3.3 70B', vision: false },
  { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Meta Llama 3.1 8B', vision: false },
  // Mistral
  { id: 'mistralai/mistral-large', label: 'Mistral Large', vision: false },
  { id: 'mistralai/mistral-small', label: 'Mistral Small', vision: false },
  // Other
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B', vision: false },
  { id: 'microsoft/phi-3-mini-128k-instruct', label: 'Microsoft Phi-3 Mini', vision: false },
];

export function getModelOptionsForSelect(): Array<{ value: string; label: string }> {
  return OPENROUTER_MODEL_OPTIONS.map((m) => ({ value: m.id, label: m.label }));
}

/** Default model for vision extraction when the configured model does not support images. */
export const DEFAULT_VISION_EXTRACTION_MODEL = 'google/gemini-2.0-flash-001';

/** Whether the given model id is listed as vision-capable. */
export function isVisionCapableModel(modelId: string): boolean {
  const opt = OPENROUTER_MODEL_OPTIONS.find((m) => m.id === modelId);
  return opt?.vision === true;
}

/**
 * For extraction with an image: always use Gemini 2.0 Flash for reliability (B1).
 * Admin extraction model is ignored for vision so coordinate quality is consistent.
 */
export function getExtractionModelForVision(_configuredModel: string): string {
  return DEFAULT_VISION_EXTRACTION_MODEL;
}

/** Ensure current value appears in options (e.g. if it was custom or model list changed). */
export function optionsWithCurrent(
  options: Array<{ value: string; label: string }>,
  currentValue: string
): Array<{ value: string; label: string }> {
  if (!currentValue) return options;
  const exists = options.some((o) => o.value === currentValue);
  if (exists) return options;
  return [{ value: currentValue, label: `Current: ${currentValue}` }, ...options];
}
