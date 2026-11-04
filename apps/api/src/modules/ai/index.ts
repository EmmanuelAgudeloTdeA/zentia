import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import type { DocumentTranslator } from '../documents/index.js';
import {
  GetCalibrationStatusUseCase,
  GetProbabilitiesUseCase,
  SuggestFollowUpMessageUseCase,
  type AiDependencies,
  type AiInfrastructure,
} from './application/index.js';
import {
  GeminiProvider,
  NullLlmProvider,
  PrismaProbabilitySignalsReader,
} from './infrastructure/index.js';
import { createAiOpenApi, createAiQuoteRouter, createAiRouter } from './presentation/index.js';

export {
  createCalibrationSection,
  createNotificationProbabilityProvider,
  createTopProbabilitySection,
  followUpAssistantContributor,
  type AiDependencies,
  type AiInfrastructure,
  type LLMProvider,
  type ProbabilitySignalsReader,
} from './application/index.js';

export interface AiConfig {
  provider: 'gemini' | 'none';
  model: string;
  apiKey: string | undefined;
  timeoutMs: number;
}

/** Sin clave o con `LLM_PROVIDER=none`, siempre plantilla (desarrollo y pruebas sin red). */
export function createPrismaAiInfrastructure(
  prisma: PrismaClient,
  config: AiConfig,
  translator: DocumentTranslator,
  logger: Logger,
): AiInfrastructure {
  const llm =
    config.provider === 'gemini' && config.apiKey
      ? new GeminiProvider({ apiKey: config.apiKey, model: config.model, translator, logger })
      : new NullLlmProvider();
  return {
    llm,
    signals: new PrismaProbabilitySignalsReader(prisma),
    llmTimeoutMs: config.timeoutMs,
  };
}

export function createAiModules({
  requireAuth,
  publicLimiter: _publicLimiter,
  ...deps
}: ModuleDependencies & AiDependencies): ModuleDefinition[] {
  return [
    {
      name: 'ai',
      basePath: '/ai',
      router: createAiRouter({
        probabilities: new GetProbabilitiesUseCase(deps),
        calibration: new GetCalibrationStatusUseCase(deps),
        requireAuth,
      }),
      openapi: createAiOpenApi(),
    },
    {
      name: 'ai-quotes',
      basePath: '/quotes',
      router: createAiQuoteRouter({
        suggest: new SuggestFollowUpMessageUseCase(deps),
        requireAuth,
      }),
      openapi: new OpenAPIRegistry(),
    },
  ];
}
