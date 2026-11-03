import {
  toSearchKey,
  type HistoryEntryDto,
  type QuoteDto,
  type QuoteEventDto,
  type QuoteListDto,
  type QuoteListFilter,
} from '@zentia/shared';
import { scopeFilter, type Actor } from '../../auth/index.js';
import type { Quote } from '../domain/index.js';
import type { EventRecord } from './ports/index.js';
import { toQuoteDto, toQuoteSummaryDto } from './quote-dto.js';
import { loadVisible } from './quote-support.js';
import type { QuotesDependencies } from './quotes-dependencies.js';

const NUMBER_PATTERN = /^(?:COT-?)?0*(\d{1,9})$/i;

export class ListQuotesUseCase {
  constructor(private readonly deps: Pick<QuotesDependencies, 'quotes'>) {}

  async execute(actor: Actor, filter: QuoteListFilter): Promise<QuoteListDto> {
    const { page, pageSize } = filter;
    const q = filter.q?.trim();
    const numberMatch = q ? NUMBER_PATTERN.exec(q) : null;
    const scope = scopeFilter(actor);
    const result = await this.deps.quotes.list({
      statuses: filter.status,
      customerId: filter.customerId,
      ownerId: scope.ownerId ?? filter.ownerId,
      number: numberMatch?.[1] ? Number(numberMatch[1]) : undefined,
      customerKey: q ? toSearchKey(q) || undefined : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: result.items.map(toQuoteSummaryDto), total: result.total, page, pageSize };
  }
}

export class GetQuoteUseCase {
  constructor(private readonly deps: QuotesDependencies) {}

  async execute(actor: Actor, id: string): Promise<QuoteDto> {
    return toQuoteDto(this.deps, await loadVisible(this.deps, id, actor), actor);
  }
}

function toEventDto(event: EventRecord): QuoteEventDto {
  return {
    id: event.id,
    type: event.type,
    at: event.createdAt.toISOString(),
    actor: event.actor,
    note: event.note,
    data: event.data,
  };
}

/** Versiones y eventos de más reciente a más antiguo; los eventos con `versionId` van dentro de su versión. */
export class GetQuoteHistoryUseCase {
  constructor(private readonly deps: Pick<QuotesDependencies, 'quotes'>) {}

  async execute(actor: Actor, id: string): Promise<HistoryEntryDto[]> {
    await loadVisible(this.deps, id, actor);
    const { versions, events } = await this.deps.quotes.history(id);
    const grouped = new Set(versions.map((version) => version.id));
    const entries: HistoryEntryDto[] = [
      ...versions.map((version) => ({
        kind: 'VERSION' as const,
        at: version.createdAt.toISOString(),
        actor: version.author,
        version: {
          number: version.number,
          changes: version.changes,
          customerRequest: version.customerRequest,
          total: version.total,
        },
        events: events.filter((event) => event.versionId === version.id).map(toEventDto),
      })),
      ...events
        .filter((event) => !event.versionId || !grouped.has(event.versionId))
        .map((event) => ({
          kind: 'EVENT' as const,
          at: event.createdAt.toISOString(),
          actor: event.actor,
          event: toEventDto(event),
        })),
    ];
    return entries.sort((a, b) => b.at.localeCompare(a.at));
  }
}

/** Lectura pública para M5 y M7, con el alcance del actor. */
export interface QuoteReader {
  getForActor(id: string, actor: Actor): Promise<Quote>;
}

export class RepositoryQuoteReader implements QuoteReader {
  constructor(private readonly deps: Pick<QuotesDependencies, 'quotes'>) {}

  getForActor(id: string, actor: Actor): Promise<Quote> {
    return loadVisible(this.deps, id, actor);
  }
}
