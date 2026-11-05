import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../../core/logger/index.js';
import { JsonDocumentTranslator } from '../documents/index.js';
import { createPrismaAiInfrastructure, type AiConfig } from './index.js';
import { GeminiProvider, NullLlmProvider } from './infrastructure/index.js';

// El adaptador de señales solo guarda el cliente; aquí no se consulta la base.
const prisma = {} as PrismaClient;

function build(config: Partial<AiConfig>) {
  return createPrismaAiInfrastructure(
    prisma,
    {
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      apiKey: undefined,
      timeoutMs: 4000,
      ...config,
    },
    new JsonDocumentTranslator(),
    createLogger('silent'),
  );
}

describe('createPrismaAiInfrastructure', () => {
  it('falls back to the template provider when gemini has no API key', () => {
    expect(build({}).llm).toBeInstanceOf(NullLlmProvider);
  });

  it('uses the template provider with LLM_PROVIDER=none even with a key', () => {
    expect(build({ provider: 'none', apiKey: 'key' }).llm).toBeInstanceOf(NullLlmProvider);
  });

  it('uses Gemini when the provider is gemini and a key is set', () => {
    expect(build({ apiKey: 'key' }).llm).toBeInstanceOf(GeminiProvider);
  });
});
