import type { AiInfrastructure, LLMProvider } from '../modules/ai/index.js';
import type { QuoteSignals } from '../modules/ai/domain/index.js';

/** Fake de IA: el LLM y las señales se controlan desde cada prueba. */
export function createFakeAi(options: { llm?: LLMProvider; timeoutMs?: number } = {}) {
  const signals: QuoteSignals[] = [];
  let closed = 0;
  const infrastructure: AiInfrastructure = {
    llm: options.llm ?? { generateFollowUp: () => Promise.reject(new Error('LLM_DISABLED')) },
    llmTimeoutMs: options.timeoutMs ?? 4000,
    signals: {
      async getSignals(ids, ownerId) {
        return signals.filter(
          (item) => ids.includes(item.quoteId) && (!ownerId || item.ownerId === ownerId),
        );
      },
      async sentSignals(ownerId) {
        return signals.filter(
          (item) => item.status === 'SENT' && (!ownerId || item.ownerId === ownerId),
        );
      },
      async countClosed() {
        return closed;
      },
    },
  };
  return {
    infrastructure,
    signals,
    setClosed: (value: number) => {
      closed = value;
    },
  };
}

export type FakeAi = ReturnType<typeof createFakeAi>;
