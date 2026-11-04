import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { alertsFor } from '../domain/index.js';
import {
  PostgresJobLock,
  PrismaFollowUpReadRepository,
  PrismaNotificationRepository,
} from './prisma-follow-up.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Prisma follow-up (integration)', () => {
  let prisma: PrismaClient;
  let ownerId: string;
  let customerId: string;
  let quoteId: string;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
  });

  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.interaction.deleteMany();
    await prisma.quoteEvent.deleteMany();
    await prisma.quoteVersion.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    const owner = await prisma.user.create({
      data: { email: 'ana@empresa.co', name: 'Ana', passwordHash: 'h', role: 'SELLER' },
    });
    ownerId = owner.id;
    const customer = await prisma.customer.create({
      data: {
        name: 'Acme',
        nameKey: 'acme',
        documentId: '900123',
        email: 'a@b.co',
        createdById: owner.id,
      },
    });
    customerId = customer.id;
    const quote = await prisma.quote.create({
      data: {
        number: 7,
        customerId,
        ownerId,
        createdById: ownerId,
        status: 'SENT',
        shippingTaxable: false,
        subtotal: 0,
        linesVat: 0,
        shippingVat: 0,
        total: 0,
        // 2026-10-30 22:00 en Bogotá (03:00 UTC del día siguiente)
        sentAt: new Date('2026-10-31T03:00:00.000Z'),
        expiresAt: new Date('2026-11-06T00:00:00.000Z'),
      },
    });
    quoteId = quote.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const candidates = () => new PrismaFollowUpReadRepository(prisma).sentQuotesWithActiveOwner();

  it('reads Bogotá dates and the latest relevant interaction', async () => {
    expect(await candidates()).toMatchObject([
      {
        quoteId,
        ownerId,
        number: 7,
        customerName: 'Acme',
        expiresAt: '2026-11-06',
        sentDay: '2026-10-30',
        lastInteractionDay: null,
      },
    ]);
    const other = await prisma.customer.create({
      data: {
        name: 'Otro',
        nameKey: 'otro',
        documentId: '800',
        email: 'o@b.co',
        createdById: ownerId,
      },
    });
    const add = (data: { customerId: string; quoteId?: string; occurredAt: string }) =>
      prisma.interaction.create({
        data: {
          ...data,
          occurredAt: new Date(data.occurredAt),
          type: 'CALL',
          note: 'x',
          authorId: ownerId,
        },
      });
    await add({ customerId: other.id, occurredAt: '2026-11-04T15:00:00.000Z' });
    expect((await candidates())[0]?.lastInteractionDay).toBeNull();
    await add({ customerId, occurredAt: '2026-11-01T15:00:00.000Z' });
    await add({ customerId, quoteId, occurredAt: '2026-11-02T04:00:00.000Z' });
    expect((await candidates())[0]?.lastInteractionDay).toBe('2026-11-01');
  });

  it('skips inactive owners and quotes that are not sent', async () => {
    await prisma.user.update({ where: { id: ownerId }, data: { isActive: false } });
    expect(await candidates()).toEqual([]);
    await prisma.user.update({ where: { id: ownerId }, data: { isActive: true } });
    await prisma.quote.update({ where: { id: quoteId }, data: { status: 'APPROVED' } });
    expect(await candidates()).toEqual([]);
  });

  it('inserts alerts idempotently and opens a new cycle after an interaction', async () => {
    const repo = new PrismaNotificationRepository(prisma);
    const params = { expiringAlertDays: 3, followUpDays: 5 };
    expect(await repo.insertMany(alertsFor(await candidates(), '2026-11-04', params))).toBe(2);
    expect(await repo.insertMany(alertsFor(await candidates(), '2026-11-04', params))).toBe(0);
    await prisma.interaction.create({
      data: {
        customerId,
        quoteId,
        type: 'WHATSAPP',
        note: 'x',
        occurredAt: new Date('2026-11-04T15:00:00.000Z'),
        authorId: ownerId,
      },
    });
    expect(await repo.insertMany(alertsFor(await candidates(), '2026-11-09', params))).toBe(1);
    expect(await repo.countUnread(ownerId)).toBe(3);
  });

  it('excludes expired quotes', async () => {
    await prisma.quote.update({ where: { id: quoteId }, data: { status: 'EXPIRED' } });
    expect(await candidates()).toEqual([]);
  });

  it('ignores interactions linked to another quote of the same customer', async () => {
    const sibling = await prisma.quote.create({
      data: {
        number: 8,
        customerId,
        ownerId,
        createdById: ownerId,
        status: 'SENT',
        shippingTaxable: false,
        subtotal: 0,
        linesVat: 0,
        shippingVat: 0,
        total: 0,
        sentAt: new Date('2026-10-31T03:00:00.000Z'),
        expiresAt: new Date('2026-11-06T00:00:00.000Z'),
      },
    });
    await prisma.interaction.create({
      data: {
        customerId,
        quoteId: sibling.id,
        type: 'CALL',
        note: 'x',
        occurredAt: new Date('2026-11-03T15:00:00.000Z'),
        authorId: ownerId,
      },
    });
    const byQuote = new Map((await candidates()).map((c) => [c.quoteId, c.lastInteractionDay]));
    expect(byQuote.get(quoteId)).toBeNull();
    expect(byQuote.get(sibling.id)).toBe('2026-11-03');
  });

  it('opens a new no follow-up cycle when the quote is resent', async () => {
    const repo = new PrismaNotificationRepository(prisma);
    const params = { expiringAlertDays: 3, followUpDays: 5 };
    const noFollowUp = async (today: string) =>
      alertsFor(await candidates(), today, params).filter((a) => a.type === 'QUOTE_NO_FOLLOW_UP');
    expect(await repo.insertMany(await noFollowUp('2026-11-04'))).toBe(1);
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        sentAt: new Date('2026-11-05T15:00:00.000Z'),
        expiresAt: new Date('2026-11-20T00:00:00.000Z'),
      },
    });
    const next = await noFollowUp('2026-11-10');
    expect(next).toMatchObject([{ referenceDate: '2026-11-05' }]);
    expect(await repo.insertMany(next)).toBe(1);
  });

  it('transfers unread notifications inside the transaction and rolls back with it', async () => {
    const repo = new PrismaNotificationRepository(prisma);
    const target = await prisma.user.create({
      data: { email: 'b@empresa.co', name: 'Beto', passwordHash: 'h', role: 'SELLER' },
    });
    await repo.insertMany([
      { userId: ownerId, quoteId, type: 'QUOTE_EXPIRING', referenceDate: '2026-11-06', params: {} },
    ]);
    await expect(
      prisma.$transaction(async (tx) => {
        await repo.transferUnread(tx, quoteId, target.id);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await repo.countUnread(ownerId)).toBe(1);
    await prisma.$transaction((tx) => repo.transferUnread(tx, quoteId, target.id));
    expect(await repo.countUnread(target.id)).toBe(1);
  });

  it('lets only one concurrent job hold the lock', async () => {
    const lock = new PostgresJobLock(prisma);
    const slow = () => new Promise<number>((resolve) => setTimeout(() => resolve(1), 300));
    const results = await Promise.all([lock.withLock('job', slow), lock.withLock('job', slow)]);
    expect(results.sort()).toEqual([1, null]);
  });
});
