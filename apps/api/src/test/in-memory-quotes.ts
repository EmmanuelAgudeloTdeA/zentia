import { randomUUID } from 'node:crypto';
import { toSearchKey, type QuoteChanges } from '@zentia/shared';
import type { Quote, QuoteItem, QuotesInfrastructure } from '../modules/quotes/index.js';
import type { QuotesTransaction } from '../modules/quotes/index.js';
import type {
  EventRecord,
  NewQuote,
  NewQuoteEvent,
  NewQuoteItem,
  NewQuoteVersion,
  QuoteRepository,
  QuoteSearch,
  QuoteUpdate,
  VersionRecord,
} from '../modules/quotes/application/index.js';

interface Lookups {
  customer: (id: string) => { id: string; name: string; documentId: string; isActive: boolean };
  user: (id: string) => { id: string; name: string; isActive: boolean } | null;
}

type StoredQuote = Omit<Quote, 'customer' | 'owner' | 'createdBy' | 'voidReason'> & {
  customerId: string;
  ownerId: string;
  createdById: string;
};

interface StoredVersion extends NewQuoteVersion {
  id: string;
  createdAt: Date;
}

interface StoredEvent extends NewQuoteEvent {
  id: string;
  createdAt: Date;
}

let tick = Date.parse('2026-11-03T15:00:00.000Z');
/** Fechas crecientes para que cada escritura cambie `updatedAt` y el orden del historial sea estable. */
const nextDate = () => new Date((tick += 1000));

export class InMemoryQuoteRepository implements QuoteRepository {
  readonly quotes = new Map<string, StoredQuote>();
  readonly versions: StoredVersion[] = [];
  readonly events: StoredEvent[] = [];
  lastNumber = 0;

  constructor(private readonly lookups: Lookups) {}

  private person(id: string) {
    const user = this.lookups.user(id);
    return { id, name: user?.name ?? '?' };
  }

  private toItems(items: readonly NewQuoteItem[]): QuoteItem[] {
    return [...items]
      .sort((a, b) => a.position - b.position)
      .map(({ position: _position, ...item }) => ({ ...item, id: randomUUID() }));
  }

  async findById(id: string): Promise<Quote | null> {
    const stored = this.quotes.get(id);
    if (!stored) return null;
    const { customerId, ownerId, createdById, ...quote } = stored;
    const voided = [...this.events]
      .reverse()
      .find((event) => event.quoteId === id && event.data['to'] === 'VOIDED');
    return {
      ...quote,
      items: stored.items.map((item) => ({ ...item })),
      customer: this.lookups.customer(customerId),
      owner: this.person(ownerId),
      createdBy: this.person(createdById),
      voidReason: stored.status === 'VOIDED' ? (voided?.note ?? null) : null,
    };
  }

  async lockForUpdate(id: string): Promise<boolean> {
    return this.quotes.has(id);
  }

  async list(search: QuoteSearch) {
    const matches = [...this.quotes.values()]
      .filter((q) => search.statuses.length === 0 || search.statuses.includes(q.status))
      .filter((q) => !search.ownerId || q.ownerId === search.ownerId)
      .filter((q) => !search.customerId || q.customerId === search.customerId)
      .filter(
        (q) =>
          (!search.firstSentFrom ||
            (q.firstSentAt !== null && q.firstSentAt >= search.firstSentFrom)) &&
          (!search.firstSentBefore ||
            (q.firstSentAt !== null && q.firstSentAt < search.firstSentBefore)),
      )
      .filter((q) => {
        if (search.number === undefined && !search.customerKey) return true;
        const name = toSearchKey(this.lookups.customer(q.customerId).name);
        return (
          q.number === search.number ||
          (search.customerKey !== undefined && name.includes(search.customerKey))
        );
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return {
      items: matches.slice(search.skip, search.skip + search.take).map((q) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        customer: { id: q.customerId, name: this.lookups.customer(q.customerId).name },
        owner: this.person(q.ownerId),
        total: q.total,
        expiresAt: q.expiresAt,
        updatedAt: q.updatedAt,
      })),
      total: matches.length,
    };
  }

  async create({ items, ...quote }: NewQuote): Promise<string> {
    const now = nextDate();
    const id = randomUUID();
    this.quotes.set(id, {
      ...quote,
      id,
      status: 'DRAFT',
      expiresAt: null,
      sentAt: null,
      firstSentAt: null,
      approvedAt: null,
      currentVersion: 0,
      createdAt: now,
      updatedAt: now,
      items: this.toItems(items),
    });
    return id;
  }

  async update(id: string, changes: QuoteUpdate): Promise<void> {
    const current = this.quotes.get(id);
    if (!current) throw new Error(`Quote ${id} not found`);
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    this.quotes.set(id, { ...current, ...defined, updatedAt: nextDate() });
  }

  async replaceItems(id: string, items: NewQuoteItem[]): Promise<void> {
    const current = this.quotes.get(id);
    if (!current) throw new Error(`Quote ${id} not found`);
    current.items = this.toItems(items);
  }

  async addVersion(version: NewQuoteVersion): Promise<string> {
    const id = randomUUID();
    this.versions.push({ ...version, id, createdAt: nextDate() });
    return id;
  }

  async addEvents(events: NewQuoteEvent[]): Promise<void> {
    for (const event of events)
      this.events.push({ ...event, id: randomUUID(), createdAt: nextDate() });
  }

  async history(id: string) {
    const versions: VersionRecord[] = this.versions
      .filter((version) => version.quoteId === id)
      .map((version) => ({
        id: version.id,
        number: version.number,
        changes: version.changes as QuoteChanges | null,
        customerRequest: version.customerRequest,
        total: version.snapshot.total,
        author: this.person(version.authorId),
        createdAt: version.createdAt,
      }));
    const events: EventRecord[] = this.events
      .filter((event) => event.quoteId === id)
      .map((event) => ({
        id: event.id,
        type: event.type,
        actor: event.actorId ? this.person(event.actorId) : null,
        versionId: event.versionId ?? null,
        note: event.note ?? null,
        data: event.data,
        createdAt: event.createdAt,
      }));
    return { versions, events };
  }

  async expireDue(today: string): Promise<string[]> {
    const due = [...this.quotes.values()].filter(
      (q) => q.status === 'SENT' && q.expiresAt !== null && q.expiresAt < today,
    );
    for (const quote of due) await this.update(quote.id, { status: 'EXPIRED' });
    return due.map((quote) => quote.id);
  }
}

export interface InMemoryQuotes extends QuotesInfrastructure {
  quotes: InMemoryQuoteRepository;
}

export function createInMemoryQuotes(lookups: Lookups): InMemoryQuotes {
  const quotes = new InMemoryQuoteRepository(lookups);
  const tx: QuotesTransaction = {
    quotes,
    sequence: { next: async () => ++quotes.lastNumber },
    client: null,
  };
  return {
    quotes,
    unitOfWork: { run: (work) => work(tx) },
    users: {
      async findActive(id) {
        const user = lookups.user(id);
        return user?.isActive ? { id: user.id, name: user.name } : null;
      },
    },
  };
}
