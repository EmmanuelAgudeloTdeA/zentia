import {
  daysBetweenDays,
  followUpReferenceDate,
  formatQuoteNumber,
  isWithoutFollowUp,
  type CalibrationStatusDto,
  type FollowUpMessageDto,
  type ProbabilityDto,
  type TopProbabilityItem,
} from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import { resolveScope, type Actor } from '../../auth/index.js';
import type { DashboardSection } from '../../dashboard/index.js';
import type { AllowedActionsContributor } from '../../quotes/index.js';
import {
  amountBucket,
  calculateProbability,
  finalizeMessage,
  promptCategories,
  type QuoteSignals,
} from '../domain/index.js';
import type { AiDependencies } from './ai-ports.js';

function toProbabilityDto(
  signals: QuoteSignals,
  today: string,
  followUpDays: number,
): ProbabilityDto {
  const { probability, factors } = calculateProbability(signals, today, followUpDays);
  return { quoteId: signals.quoteId, probability, label: 'RULES_ESTIMATE', factors };
}

/** Rechaza si el proveedor no responde a tiempo, aunque ignore la señal de cancelación. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('LLM_TIMEOUT')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** RF-08: mensaje sugerido y editable; ante cualquier fallo de la IA, plantilla (RN-38) y HTTP 200. */
export class SuggestFollowUpMessageUseCase {
  constructor(private readonly deps: AiDependencies) {}

  async execute(actor: Actor, quoteId: string): Promise<FollowUpMessageDto> {
    const quote = await this.deps.quotes.getForActor(quoteId, actor);
    if (quote.status !== 'SENT') {
      throw new AppError('QUOTE_INVALID_TRANSITION', 409, { from: quote.status, to: 'SENT' });
    }
    const [customer, profile, params, signals] = await Promise.all([
      this.deps.customers.getById(quote.customer.id),
      this.deps.settings.getDocumentProfile(),
      this.deps.settings.getCommercialParameters(),
      this.deps.signals.getSignals([quote.id], null),
    ]);
    const today = this.deps.clock.today();
    const sentDay = signals[0]?.sentDay ?? today;
    const reference = followUpReferenceDate(signals[0]?.lastInteractionDay ?? null, sentDay);
    const days = Math.max(0, daysBetweenDays(reference, today));
    const names = { customer: customer.name, seller: quote.owner.name };
    const locale = profile.documentLocale;

    let message: string;
    try {
      const text = await withTimeout(
        this.deps.llm.generateFollowUp(
          {
            daysWithoutReply: days,
            amountBucket: amountBucket(quote.total),
            categories: promptCategories(quote.items),
            locale,
          },
          { timeoutMs: this.deps.llmTimeoutMs },
        ),
        this.deps.llmTimeoutMs,
      );
      message = finalizeMessage(text, names);
    } catch {
      message = '';
    }
    const source = message ? 'AI' : 'TEMPLATE';
    if (!message) {
      message = finalizeMessage(
        this.deps.translator.t('ai.fallback.followUp', locale, { days }),
        names,
      );
    }
    return {
      message,
      source,
      highlighted: isWithoutFollowUp(reference, today, params.followUpDays),
      daysWithoutFollowUp: days,
      contact: { phone: customer.phone, email: customer.email },
    };
  }
}

export class GetProbabilitiesUseCase {
  constructor(private readonly deps: AiDependencies) {}

  /** Omite las cotizaciones ajenas para un vendedor y las que no están Enviadas. */
  async execute(actor: Actor, quoteIds: readonly string[]): Promise<ProbabilityDto[]> {
    const ownerId = resolveScope(actor.role) === 'OWN' ? actor.id : null;
    const [signals, params] = await Promise.all([
      this.deps.signals.getSignals(quoteIds, ownerId),
      this.deps.settings.getCommercialParameters(),
    ]);
    const today = this.deps.clock.today();
    return signals
      .filter((item) => item.status === 'SENT')
      .map((item) => toProbabilityDto(item, today, params.followUpDays));
  }
}

export class GetCalibrationStatusUseCase {
  constructor(private readonly deps: AiDependencies) {}

  async execute(): Promise<CalibrationStatusDto> {
    const [closedCount, params] = await Promise.all([
      this.deps.signals.countClosed(),
      this.deps.settings.getCommercialParameters(),
    ]);
    return {
      closedCount,
      threshold: params.coldStartThreshold,
      readyForCalibration: closedCount >= params.coldStartThreshold,
    };
  }
}

/** M4: el asistente solo se ofrece en cotizaciones Enviadas. */
export const followUpAssistantContributor: AllowedActionsContributor = (quote) =>
  quote.status === 'SENT' ? ['followUpAssistant'] : [];

const TOP_LIMIT = 5;

/** M8: las 5 Enviadas con mayor probabilidad, con el alcance y el vendedor del tablero (sin período). */
export function createTopProbabilitySection(deps: AiDependencies): DashboardSection {
  return async (_actor, filters) => {
    const [signals, params] = await Promise.all([
      deps.signals.sentSignals(filters.ownerId),
      deps.settings.getCommercialParameters(),
    ]);
    const today = deps.clock.today();
    const items: TopProbabilityItem[] = signals
      .map((item) => ({
        item,
        probability: calculateProbability(item, today, params.followUpDays).probability,
      }))
      .sort(
        (a, b) =>
          b.probability - a.probability ||
          (a.item.expiresAt ?? '').localeCompare(b.item.expiresAt ?? ''),
      )
      .slice(0, TOP_LIMIT)
      .map(({ item, probability }) => ({
        quoteId: item.quoteId,
        displayNumber: formatQuoteNumber(item.number),
        customerName: item.customerName,
        ownerName: item.ownerName,
        total: item.total,
        expiresAt: item.expiresAt ?? today,
        probability,
      }));
    return { key: 'topProbability', items };
  };
}

/** M8 (V1 del ui-brief): estado de calibración visible para gerente y administrador. */
export function createCalibrationSection(deps: AiDependencies): DashboardSection {
  const status = new GetCalibrationStatusUseCase(deps);
  return async (actor) =>
    actor.role === 'SELLER' ? null : { key: 'calibration', items: [await status.execute()] };
}

/** M6: probabilidad por cotización para ordenar las alertas. */
export function createNotificationProbabilityProvider(deps: AiDependencies) {
  return async (quoteIds: readonly string[]): Promise<Map<string, number>> => {
    const [signals, params] = await Promise.all([
      deps.signals.getSignals(quoteIds, null),
      deps.settings.getCommercialParameters(),
    ]);
    const today = deps.clock.today();
    return new Map(
      signals
        .filter((item) => item.status === 'SENT')
        .map((item) => [
          item.quoteId,
          calculateProbability(item, today, params.followUpDays).probability,
        ]),
    );
  };
}
