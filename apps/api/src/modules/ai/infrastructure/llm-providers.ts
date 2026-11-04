import { GoogleGenAI } from '@google/genai';
import type { Logger } from 'pino';
import type { DocumentTranslator } from '../../documents/index.js';
import type { LLMProvider } from '../application/index.js';
import type { FollowUpPromptInput } from '../domain/index.js';

/** Proveedor de `LLM_PROVIDER=none`: falla siempre y el caso de uso usa la plantilla. */
export class NullLlmProvider implements LLMProvider {
  generateFollowUp(): Promise<string> {
    return Promise.reject(new Error('LLM_DISABLED'));
  }
}

export interface GenerateContentClient {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config: { abortSignal: AbortSignal; maxOutputTokens: number; temperature: number };
    }): Promise<{ text?: string | undefined }>;
  };
}

/** Gemini vía `@google/genai`. El log solo lleva metadatos; nunca el prompt ni la respuesta. */
export class GeminiProvider implements LLMProvider {
  private readonly client: GenerateContentClient;

  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      translator: DocumentTranslator;
      logger: Logger;
      client?: GenerateContentClient;
    },
  ) {
    // Sin reintentos (S9.1.4): un intento por solicitud.
    this.client =
      options.client ??
      new GoogleGenAI({ apiKey: options.apiKey, httpOptions: { retryOptions: { attempts: 1 } } });
  }

  async generateFollowUp(
    input: FollowUpPromptInput,
    { timeoutMs }: { timeoutMs: number },
  ): Promise<string> {
    const { translator, model, logger } = this.options;
    const prompt = translator.t('ai.prompt.followUp', input.locale, {
      days: input.daysWithoutReply,
      amountRange: translator.t(`ai.amountBucket.${input.amountBucket}`, input.locale),
      categories:
        input.categories.length > 0
          ? input.categories.join(', ')
          : translator.t('ai.noCategories', input.locale),
    });
    const startedAt = performance.now();
    try {
      const response = await this.client.models.generateContent({
        model,
        contents: prompt,
        config: {
          abortSignal: AbortSignal.timeout(timeoutMs),
          maxOutputTokens: 400,
          temperature: 0.7,
        },
      });
      const text = response.text ?? '';
      logger.info(
        {
          provider: 'gemini',
          model,
          latencyMs: Math.round(performance.now() - startedAt),
          result: text ? 'ok' : 'empty',
        },
        'LLM follow-up',
      );
      return text;
    } catch (error) {
      logger.warn(
        {
          provider: 'gemini',
          model,
          latencyMs: Math.round(performance.now() - startedAt),
          result: 'error',
          errorType: error instanceof Error ? error.name : 'unknown',
        },
        'LLM follow-up',
      );
      throw error;
    }
  }
}
