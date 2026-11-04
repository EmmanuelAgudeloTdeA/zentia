import type { Clock } from '../../../core/clock/index.js';
import type { SettingsReader } from '../../company-settings/index.js';
import type { CustomerReader } from '../../customers/index.js';
import type { DocumentTranslator } from '../../documents/index.js';
import type { QuoteReader } from '../../quotes/index.js';
import type { FollowUpPromptInput, QuoteSignals } from '../domain/index.js';

/** Puerto del proveedor de IA: solo acepta señales estructuradas, nunca texto libre (RN-37). */
export interface LLMProvider {
  generateFollowUp(input: FollowUpPromptInput, options: { timeoutMs: number }): Promise<string>;
}

/** Repositorio de solo lectura (decisión 72). */
export interface ProbabilitySignalsReader {
  getSignals(quoteIds: readonly string[], ownerId: string | null): Promise<QuoteSignals[]>;
  /** Señales de todas las Enviadas del alcance (para el top del tablero). */
  sentSignals(ownerId: string | null): Promise<QuoteSignals[]>;
  /** Aprobadas + rechazadas + vencidas, sin datos sintéticos (`DEMO…`). */
  countClosed(): Promise<number>;
}

export interface AiInfrastructure {
  llm: LLMProvider;
  signals: ProbabilitySignalsReader;
  llmTimeoutMs: number;
}

export interface AiDependencies extends AiInfrastructure {
  quotes: QuoteReader;
  customers: CustomerReader;
  settings: SettingsReader;
  translator: DocumentTranslator;
  clock: Clock;
}
