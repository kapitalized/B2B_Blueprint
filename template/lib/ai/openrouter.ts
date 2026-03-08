/**
 * OpenRouter API client for the AI pipeline.
 * When OPENROUTER_API_KEY is not set, calls are no-ops and return stub data so the app runs without manual setup.
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
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(API_KEY && API_KEY.length > 0);
}

/**
 * Call OpenRouter chat completions. Returns stub content when API key is missing.
 */
export async function callOpenRouter(options: OpenRouterOptions): Promise<string> {
  if (!isOpenRouterConfigured()) {
    return '[OpenRouter not configured: set OPENROUTER_API_KEY in .env.local]';
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
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? '';
  return content;
}
