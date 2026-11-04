import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { JsonDocumentTranslator } from '../../documents/index.js';
import { GeminiProvider, NullLlmProvider, type GenerateContentClient } from './llm-providers.js';

const input = {
  daysWithoutReply: 7,
  amountBucket: '1M_5M' as const,
  categories: ['Tecnología'],
  locale: 'es' as const,
};

function provider(generateContent: GenerateContentClient['models']['generateContent']) {
  return new GeminiProvider({
    apiKey: 'test',
    model: 'gemini-test-flash',
    translator: new JsonDocumentTranslator(),
    logger: pino({ level: 'silent' }),
    client: { models: { generateContent } },
  });
}

describe('GeminiProvider', () => {
  it('uses the configured model, a localized prompt and an abort signal', async () => {
    const generate = vi.fn().mockResolvedValue({ text: 'Hola {{CLIENTE}}' });
    await expect(provider(generate).generateFollowUp(input, { timeoutMs: 4000 })).resolves.toBe(
      'Hola {{CLIENTE}}',
    );
    const [params] = generate.mock.calls[0] as [
      Parameters<GenerateContentClient['models']['generateContent']>[0],
    ];
    expect(params.model).toBe('gemini-test-flash');
    expect(params.config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(params.contents).toContain('7 días');
    expect(params.contents).toContain('entre 1 y 5 millones de pesos');
    expect(params.contents).toContain('Tecnología');
    expect(params.contents).toContain('{{CLIENTE}}');
  });

  it('propagates provider errors so the use case falls back to the template', async () => {
    const error = Object.assign(new Error('Too Many Requests'), { status: 429 });
    await expect(
      provider(vi.fn().mockRejectedValue(error)).generateFollowUp(input, { timeoutMs: 4000 }),
    ).rejects.toThrow('Too Many Requests');
    await expect(new NullLlmProvider().generateFollowUp()).rejects.toThrow('LLM_DISABLED');
  });
});
