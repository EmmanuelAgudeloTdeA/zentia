import {
  formatQuoteNumber,
  type CreateInteractionInput,
  type InteractionDto,
  type InteractionListDto,
  type InteractionListFilter,
  type NotificationDto,
  type NotificationListDto,
  type NotificationListFilter,
  type QuoteStatus,
} from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { ScheduledJob } from '../../../core/scheduler/index.js';
import { resolveScope, type Actor } from '../../auth/index.js';
import type { QuoteReassignedListener } from '../../quotes/index.js';
import { alertsFor, type Interaction, type Notification } from '../domain/index.js';
import type { FollowUpDependencies } from './follow-up-dependencies.js';

function toInteractionDto(interaction: Interaction): InteractionDto {
  return {
    id: interaction.id,
    customerId: interaction.customerId,
    quote: interaction.quote
      ? { id: interaction.quote.id, displayNumber: formatQuoteNumber(interaction.quote.number) }
      : null,
    type: interaction.type,
    note: interaction.note,
    occurredAt: interaction.occurredAt.toISOString(),
    author: interaction.author,
    createdAt: interaction.createdAt.toISOString(),
  };
}

function toNotificationDto(
  notification: Notification,
  probability: number | null = null,
): NotificationDto {
  return {
    probability,
    id: notification.id,
    type: notification.type,
    params: notification.params,
    referenceDate: notification.referenceDate,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    quote: {
      id: notification.quote.id,
      displayNumber: formatQuoteNumber(notification.quote.number),
      status: notification.quote.status as QuoteStatus,
    },
  };
}

// Tolerancia al reloj del navegador adelantado (el diálogo envía la hora local truncada al minuto).
const FUTURE_TOLERANCE_MS = 60_000;

/** RN-35: registro de solo agregar; la nota es texto libre y nunca va al LLM (RN-37). */
export class RegisterInteractionUseCase {
  constructor(private readonly deps: FollowUpDependencies) {}

  async execute(actor: Actor, input: CreateInteractionInput): Promise<InteractionDto> {
    const customer = await this.deps.customers.getById(input.customerId);
    const now = this.deps.clock.now();
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : now;
    if (occurredAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
      throw new AppError('INTERACTION_FUTURE_DATE', 400);
    }
    if (input.quoteId) {
      const quote = await this.deps.quotes.getForActor(input.quoteId, actor);
      if (quote.customer.id !== customer.id) throw new AppError('INTERACTION_QUOTE_MISMATCH', 400);
    }
    const interaction = await this.deps.interactions.create({
      customerId: customer.id,
      quoteId: input.quoteId ?? null,
      type: input.type,
      note: input.note,
      occurredAt,
      authorId: actor.id,
    });
    return toInteractionDto(interaction);
  }
}

export class ListInteractionsUseCase {
  constructor(private readonly deps: FollowUpDependencies) {}

  async execute(actor: Actor, filter: InteractionListFilter): Promise<InteractionListDto> {
    if (filter.quoteId) await this.deps.quotes.getForActor(filter.quoteId, actor);
    const { page, pageSize } = filter;
    const result = await this.deps.interactions.list({
      customerId: filter.customerId,
      quoteId: filter.quoteId,
      withoutQuote: filter.withoutQuote,
      visibleToOwnerId: resolveScope(actor.role) === 'OWN' ? actor.id : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: result.items.map(toInteractionDto), total: result.total, page, pageSize };
  }
}

/** Job de las 07:00: genera las alertas del día de forma idempotente. */
export class RunFollowUpAlertsUseCase {
  constructor(private readonly deps: FollowUpDependencies) {}

  async execute(): Promise<number> {
    const params = await this.deps.settings.getCommercialParameters();
    const candidates = await this.deps.followUpRead.sentQuotesWithActiveOwner();
    return this.deps.notifications.insertMany(
      alertsFor(candidates, this.deps.clock.today(), params),
    );
  }
}

export class ListNotificationsUseCase {
  constructor(private readonly deps: FollowUpDependencies) {}

  async execute(actor: Actor, filter: NotificationListFilter): Promise<NotificationListDto> {
    const { unreadOnly, page, pageSize } = filter;
    const skip = (page - 1) * pageSize;
    const provider = this.deps.probabilityProvider;
    if (filter.sort === 'probability' && provider) {
      try {
        return await this.byProbability(actor, filter, provider);
      } catch {
        // Si no se puede calcular la probabilidad, se responde por fecha (S9.3.1, ui-brief V5).
      }
    }
    const result = await this.deps.notifications.list(actor.id, {
      unreadOnly,
      skip,
      take: pageSize,
    });
    const probabilities = provider
      ? await provider(result.items.map((item) => item.quote.id)).catch(
          () => new Map<string, number>(),
        )
      : new Map<string, number>();
    return {
      sort: 'date',
      items: result.items.map((item) =>
        toNotificationDto(item, probabilities.get(item.quote.id) ?? null),
      ),
      total: result.total,
      page,
      pageSize,
    };
  }

  /** Probabilidad desc y luego fecha desc; las de cotizaciones que ya no están Enviadas, al final. */
  private async byProbability(
    actor: Actor,
    { unreadOnly, page, pageSize }: NotificationListFilter,
    provider: NonNullable<FollowUpDependencies['probabilityProvider']>,
  ): Promise<NotificationListDto> {
    const all = await this.deps.notifications.listAll(actor.id, { unreadOnly });
    const probabilities = await provider([...new Set(all.map((item) => item.quote.id))]);
    const rank = (item: Notification) => probabilities.get(item.quote.id) ?? -1;
    const sorted = [...all].sort(
      (a, b) => rank(b) - rank(a) || b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const items = sorted.slice((page - 1) * pageSize, page * pageSize);
    return {
      sort: 'probability',
      items: items.map((item) => toNotificationDto(item, probabilities.get(item.quote.id) ?? null)),
      total: all.length,
      page,
      pageSize,
    };
  }
}

export class CountUnreadUseCase {
  constructor(private readonly deps: FollowUpDependencies) {}

  async execute(actor: Actor): Promise<{ count: number }> {
    return { count: await this.deps.notifications.countUnread(actor.id) };
  }
}

export class MarkNotificationReadUseCase {
  constructor(private readonly deps: FollowUpDependencies) {}

  async execute(actor: Actor, id: string): Promise<void> {
    if (!(await this.deps.notifications.markRead(id, actor.id, this.deps.clock.now()))) {
      throw new AppError('NOTIFICATION_NOT_FOUND', 404);
    }
  }
}

export class MarkAllNotificationsReadUseCase {
  constructor(private readonly deps: FollowUpDependencies) {}

  execute(actor: Actor): Promise<void> {
    return this.deps.notifications.markAllRead(actor.id, this.deps.clock.now());
  }
}

/** Jobs diarios en America/Bogota, cada uno con su advisory lock (varias instancias). */
export function createFollowUpJobs(
  deps: Pick<FollowUpDependencies, 'jobLock'>,
  expireQuotes: { execute: () => Promise<number> },
  alerts: { execute: () => Promise<number> },
): ScheduledJob[] {
  const locked = (name: string, run: () => Promise<number>) => async () =>
    (await deps.jobLock.withLock(name, run)) ?? 0;
  return [
    {
      name: 'expire-quotes',
      cron: '5 0 * * *',
      run: locked('expire-quotes', () => expireQuotes.execute()),
    },
    {
      name: 'follow-up-alerts',
      cron: '0 7 * * *',
      run: locked('follow-up-alerts', () => alerts.execute()),
    },
  ];
}

/** Al reasignar (M4), las no leídas pasan al nuevo dueño en la misma transacción (decisión 74). */
export function createTransferNotificationsListener(
  deps: Pick<FollowUpDependencies, 'notifications'>,
): QuoteReassignedListener {
  return ({ quoteId, to }, tx) => deps.notifications.transferUnread(tx.client, quoteId, to.id);
}
