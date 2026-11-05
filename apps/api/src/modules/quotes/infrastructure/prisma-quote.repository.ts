import { Prisma, type PrismaClient } from '@prisma/client';
import type { QuoteChanges } from '@zentia/shared';
import type { UserRepository } from '../../auth/index.js';
import type {
  NewQuote,
  NewQuoteEvent,
  NewQuoteItem,
  NewQuoteVersion,
  QuoteRepository,
  QuoteSearch,
  QuoteSequence,
  QuotesInfrastructure,
  QuoteSummary,
  QuoteUpdate,
  UserDirectory,
} from '../application/index.js';
import type { Quote } from '../domain/index.js';

const person = { select: { id: true, name: true } } as const;

const quoteInclude = {
  customer: { select: { id: true, name: true, documentId: true, isActive: true } },
  owner: person,
  createdBy: person,
  items: { orderBy: { position: 'asc' } },
  events: {
    where: { type: 'STATE_CHANGED', data: { path: ['to'], equals: 'VOIDED' } },
    select: { note: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.QuoteInclude;

type QuoteRow = Prisma.QuoteGetPayload<{ include: typeof quoteInclude }>;

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
const money = (value: Prisma.Decimal) => value.toFixed(0);

function toQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    customer: row.customer,
    owner: row.owner,
    createdBy: row.createdBy,
    discountPct: row.discountPct.toString(),
    discountAmount: money(row.discountAmount),
    shippingAmount: money(row.shippingAmount),
    shippingTaxable: row.shippingTaxable,
    subtotal: money(row.subtotal),
    linesVat: money(row.linesVat),
    shippingVat: money(row.shippingVat),
    total: money(row.total),
    expiresAt: fromDate(row.expiresAt),
    sentAt: row.sentAt,
    firstSentAt: row.firstSentAt,
    approvedAt: row.approvedAt,
    currentVersion: row.currentVersion,
    voidReason: row.status === 'VOIDED' ? (row.events[0]?.note ?? null) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      category: item.category,
      unitPrice: money(item.unitPrice),
      vatRate: item.vatRate,
      quantity: item.quantity.toString(),
      lineAmount: money(item.lineAmount),
    })),
  };
}

function itemData(items: readonly NewQuoteItem[]) {
  return items.map((item) => ({ ...item }));
}

const asJson = (value: unknown) => value as Prisma.InputJsonValue;

export class PrismaQuoteRepository implements QuoteRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async findById(id: string): Promise<Quote | null> {
    const row = await this.db.quote.findUnique({ where: { id }, include: quoteInclude });
    return row ? toQuote(row) : null;
  }

  async lockForUpdate(id: string): Promise<boolean> {
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Quote" WHERE "id" = ${id}::uuid FOR UPDATE`;
    return rows.length > 0;
  }

  /** Regla de M6 en SQL, igual que el tablero: solo lee `Interaction` (dueño: seguimiento). */
  private async pendingFollowUpIds(today: string, followUpDays: number): Promise<string[]> {
    const bogotaDate = (column: Prisma.Sql) =>
      Prisma.sql`((${column}) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date`;
    const lastInteraction = Prisma.sql`(
      SELECT max(i."occurredAt") FROM "Interaction" i
      WHERE i."quoteId" = q."id" OR (i."customerId" = q."customerId" AND i."quoteId" IS NULL))`;
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      SELECT q."id" FROM "Quote" q
      WHERE q."status" = 'SENT'
        AND GREATEST(${bogotaDate(lastInteraction)}, ${bogotaDate(Prisma.sql`q."sentAt"`)}) + ${followUpDays}::int
          <= ${today}::date`;
    return rows.map((row) => row.id);
  }

  async list(search: QuoteSearch): Promise<{ items: QuoteSummary[]; total: number }> {
    const pendingIds = search.pendingFollowUp
      ? await this.pendingFollowUpIds(
          search.pendingFollowUp.today,
          search.pendingFollowUp.followUpDays,
        )
      : null;
    const or: Prisma.QuoteWhereInput[] = [];
    if (search.number !== undefined) or.push({ number: search.number });
    if (search.customerKey) or.push({ customer: { nameKey: { contains: search.customerKey } } });
    const where: Prisma.QuoteWhereInput = {
      ...(search.statuses.length > 0 ? { status: { in: [...search.statuses] } } : {}),
      ...(pendingIds ? { id: { in: pendingIds } } : {}),
      ...(search.ownerId ? { ownerId: search.ownerId } : {}),
      ...(search.customerId ? { customerId: search.customerId } : {}),
      ...(search.firstSentFrom || search.firstSentBefore
        ? {
            firstSentAt: {
              ...(search.firstSentFrom ? { gte: search.firstSentFrom } : {}),
              ...(search.firstSentBefore ? { lt: search.firstSentBefore } : {}),
            },
          }
        : {}),
      ...(or.length > 0 ? { OR: or } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.quote.findMany({
        where,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          expiresAt: true,
          updatedAt: true,
          customer: person,
          owner: person,
        },
        orderBy: [{ updatedAt: 'desc' }, { number: 'desc' }],
        skip: search.skip,
        take: search.take,
      }),
      this.db.quote.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        ...row,
        total: money(row.total),
        expiresAt: fromDate(row.expiresAt),
      })),
      total,
    };
  }

  async create({ items, ...quote }: NewQuote): Promise<string> {
    const created = await this.db.quote.create({
      data: { ...quote, items: { create: itemData(items) } },
      select: { id: true },
    });
    return created.id;
  }

  async update(id: string, { expiresAt, ...changes }: QuoteUpdate): Promise<void> {
    await this.db.quote.update({
      where: { id },
      data: { ...changes, ...(expiresAt !== undefined ? { expiresAt: toDate(expiresAt) } : {}) },
    });
  }

  async replaceItems(id: string, items: NewQuoteItem[]): Promise<void> {
    await this.db.quoteItem.deleteMany({ where: { quoteId: id } });
    await this.db.quoteItem.createMany({
      data: itemData(items).map((item) => ({ ...item, quoteId: id })),
    });
  }

  async addVersion(version: NewQuoteVersion): Promise<string> {
    const created = await this.db.quoteVersion.create({
      data: {
        quoteId: version.quoteId,
        number: version.number,
        snapshot: asJson(version.snapshot),
        changes: version.changes ? asJson(version.changes) : Prisma.JsonNull,
        customerRequest: version.customerRequest,
        authorId: version.authorId,
      },
      select: { id: true },
    });
    return created.id;
  }

  async addEvents(events: NewQuoteEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.db.quoteEvent.createMany({
      data: events.map((event) => ({
        quoteId: event.quoteId,
        type: event.type,
        actorId: event.actorId,
        versionId: event.versionId ?? null,
        note: event.note ?? null,
        data: asJson(event.data),
      })),
    });
  }

  async history(id: string) {
    const [versions, events] = await Promise.all([
      this.db.quoteVersion.findMany({
        where: { quoteId: id },
        include: { author: person },
        orderBy: { number: 'asc' },
      }),
      this.db.quoteEvent.findMany({
        where: { quoteId: id },
        include: { actor: person },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      versions: versions.map((version) => ({
        id: version.id,
        number: version.number,
        changes: version.changes as QuoteChanges | null,
        customerRequest: version.customerRequest,
        total: (version.snapshot as { total?: string }).total ?? '0',
        author: version.author,
        createdAt: version.createdAt,
      })),
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        actor: event.actor,
        versionId: event.versionId,
        note: event.note,
        data: event.data as Record<string, unknown>,
        createdAt: event.createdAt,
      })),
    };
  }

  async expireDue(today: string): Promise<string[]> {
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      UPDATE "Quote" SET "status" = 'EXPIRED', "updatedAt" = now()
      WHERE "status" = 'SENT' AND "expiresAt" < ${today}::date
      RETURNING "id"`;
    return rows.map((row) => row.id);
  }
}

/** Toma el siguiente número dentro de la transacción: si esta se revierte, el número no se pierde. */
export class PrismaQuoteSequence implements QuoteSequence {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async next(): Promise<number> {
    const rows = await this.db.$queryRaw<{ lastValue: number }[]>`
      UPDATE "QuoteSequence" SET "lastValue" = "lastValue" + 1
      WHERE "key" = 'QUOTE' RETURNING "lastValue"`;
    const value = rows[0]?.lastValue;
    if (value === undefined) throw new Error('QuoteSequence row "QUOTE" is missing');
    return value;
  }
}

export function createAuthUserDirectory(users: UserRepository): UserDirectory {
  return {
    async findActive(id) {
      const user = await users.findById(id);
      return user?.isActive ? { id: user.id, name: user.name } : null;
    },
  };
}

export function createPrismaQuotesInfrastructure(
  prisma: PrismaClient,
  users: UserRepository,
): QuotesInfrastructure {
  return {
    quotes: new PrismaQuoteRepository(prisma),
    users: createAuthUserDirectory(users),
    unitOfWork: {
      run: (work) =>
        prisma.$transaction(
          (tx) =>
            work({
              quotes: new PrismaQuoteRepository(tx),
              sequence: new PrismaQuoteSequence(tx),
              client: tx,
            }),
          { timeout: 15_000 },
        ),
    },
  };
}
