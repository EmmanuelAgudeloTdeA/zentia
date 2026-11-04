import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaProbabilitySignalsReader } from './prisma-signals.repository.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaProbabilitySignalsReader (integration)', () => {
  let prisma: PrismaClient;
  let reader: PrismaProbabilitySignalsReader;
  let ownerId: string;
  let number = 0;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
    reader = new PrismaProbabilitySignalsReader(prisma);
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
    ownerId = (
      await prisma.user.create({
        data: { email: 'a@e.co', name: 'Ana', passwordHash: 'h', role: 'SELLER' },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  async function quote(status: 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED', documentId = '900') {
    const customer = await prisma.customer.create({
      data: {
        name: `C${documentId}`,
        nameKey: 'c',
        documentId: `${documentId}-${++number}`,
        email: 'c@e.co',
        createdById: ownerId,
      },
    });
    return prisma.quote.create({
      data: {
        number,
        customerId: customer.id,
        ownerId,
        createdById: ownerId,
        status,
        shippingTaxable: false,
        subtotal: 1000,
        linesVat: 0,
        shippingVat: 0,
        total: 1000,
        sentAt: new Date('2026-11-01T03:00:00.000Z'),
        firstSentAt: new Date('2026-11-01T03:00:00.000Z'),
        expiresAt: new Date('2026-11-15T00:00:00.000Z'),
      },
    });
  }

  it('reads Bogotá dates, interactions since sending and versions after sending', async () => {
    const sent = await quote('SENT');
    await prisma.quoteVersion.createMany({
      data: [1, 2].map((versionNumber) => ({
        quoteId: sent.id,
        number: versionNumber,
        snapshot: {},
        authorId: ownerId,
      })),
    });
    expect(await reader.getSignals([sent.id], null)).toMatchObject([
      {
        status: 'SENT',
        sentDay: '2026-10-31',
        expiresAt: '2026-11-15',
        lastInteractionDay: null,
        interactedSinceSent: false,
        versionsAfterSend: 1,
        ownerName: 'Ana',
        total: '1000',
      },
    ]);
    await prisma.interaction.create({
      data: {
        customerId: sent.customerId,
        type: 'CALL',
        note: 'x',
        occurredAt: new Date('2026-11-04T15:00:00.000Z'),
        authorId: ownerId,
      },
    });
    expect(await reader.getSignals([sent.id], ownerId)).toMatchObject([
      { lastInteractionDay: '2026-11-04', interactedSinceSent: true },
    ]);
    expect(await reader.getSignals([sent.id], crypto.randomUUID())).toEqual([]);
    expect(await reader.sentSignals(null)).toHaveLength(1);
  });

  it('counts closed quotes excluding synthetic customers', async () => {
    await quote('APPROVED');
    await quote('REJECTED');
    await quote('EXPIRED', 'DEMO');
    await quote('SENT');
    expect(await reader.countClosed()).toBe(2);
  });
});
