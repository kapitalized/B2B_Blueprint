const decoder = new TextDecoder();

/**
 * Parse OpenAI-style SSE stream from OpenRouter and re-emit as SSE for the client.
 * Accumulates full content and calls onDone when stream ends (for persistence).
 */
export function transformOpenRouterStreamToSSE(
  source: ReadableStream<Uint8Array>,
  onDone: (fullContent: string) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let buffer = '';
  let fullContent = '';

  return new ReadableStream<Uint8Array>({
    start(controller) {
      (async () => {
        const reader = source.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>;
                  };
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (typeof delta === 'string') {
                    fullContent += delta;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                  }
                } catch {
                  // ignore parse errors for non-JSON lines
                }
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          onDone(fullContent);
        } catch (err) {
          console.error('[stream-sse]', err);
          onDone(fullContent);
        } finally {
          reader.releaseLock();
          controller.close();
        }
      })();
    },
  });
}
