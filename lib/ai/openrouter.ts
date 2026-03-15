/**
 * OpenRouter API client for the AI pipeline.
 * When OPENROUTER_API_KEY is not set, calls are no-ops and return stub data so the app runs without manual setup.
 * Captures token usage and cost from the response for logging and billing visibility.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface OpenRouterOptions {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  stream?: boolean;
  /** Lower values (e.g. 0.2) reduce hallucination for extraction. */
  temperature?: number;
}

/** Token usage and cost returned by OpenRouter (see https://openrouter.ai/docs/guides/administration/usage-accounting). */
export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** Total cost in USD when present. */
  cost?: number;
}

export interface OpenRouterResult {
  content: string;
  /** Reasoning/thinking tokens when the model returns them (e.g. Gemini thinking, Anthropic reasoning). */
  reasoning?: string;
  usage?: OpenRouterUsage;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(API_KEY && API_KEY.length > 0);
}

/**
 * Call OpenRouter chat completions. Returns content and usage (tokens, cost) when API key is set.
 */
export async function callOpenRouter(options: OpenRouterOptions): Promise<OpenRouterResult> {
  if (!isOpenRouterConfigured()) {
    return { content: '[OpenRouter not configured: set OPENROUTER_API_KEY in .env.local]' };
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      max_tokens: options.max_tokens ?? 4096,
      stream: options.stream ?? false,
      ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string; reasoning?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number };
  };
  const message = data.choices?.[0]?.message;
  const content = message?.content ?? '';
  const reasoning = typeof message?.reasoning === 'string' ? message.reasoning : undefined;
  const usageRaw = data.usage;
  const usage: OpenRouterUsage | undefined =
    usageRaw && typeof usageRaw.prompt_tokens === 'number' && typeof usageRaw.completion_tokens === 'number'
      ? {
          prompt_tokens: usageRaw.prompt_tokens,
          completion_tokens: usageRaw.completion_tokens,
          total_tokens: usageRaw.total_tokens ?? usageRaw.prompt_tokens + usageRaw.completion_tokens,
          cost: typeof usageRaw.cost === 'number' ? usageRaw.cost : undefined,
        }
      : undefined;
  return { content, reasoning, usage };
}

/**
 * Call OpenRouter with stream: true. Returns the raw ReadableStream from the API (OpenAI-compatible SSE).
 * Use for streaming chat responses.
 */
export async function callOpenRouterStream(options: OpenRouterOptions): Promise<ReadableStream<Uint8Array> | null> {
  if (!isOpenRouterConfigured()) return null;
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      max_tokens: options.max_tokens ?? 4096,
      stream: true,
    }),
  });
  if (!response.ok || !response.body) return null;
  return response.body;
}
