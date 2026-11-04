import { PrismaClient, type QuoteStatus } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { bogotaDayStartUtc } from '../application/index.js';
import { PrismaDashboardReadRepository } from './prisma-dashboard.repository.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaDashboardReadRepository (integration)', () => {
  let prisma: PrismaClient;
  let repo: PrismaDashboardReadRepository;
  let ownerId: string;
  let otherId: string;
  let customerId: string;
  let number = 0;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
    repo = new PrismaDashboardReadRepository(prisma);
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
      data: { email: 'a@e.co', name: 'Ana', passwordHash: 'h', role: 'SELLER' },
    });
    const other = await prisma.user.create({
      data: { email: 'b@e.co', name: 'Beto', passwordHash: 'h', role: 'SELLER' },
    });
    ownerId = owner.id;
    otherId = other.id;
    customerId = (
      await prisma.customer.create({
        data: {
          name: 'Acme',
          nameKey: 'acme',
          documentId: '900',
          email: 'c@e.co',
          createdById: ownerId,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  async function quote(
    status: QuoteStatus,
    total: number,
    firstSentAt: string | null,
    owner = ownerId,
  ) {
    return prisma.quote.create({
      data: {
        number: ++number,
        customerId,
        ownerId: owner,
        createdById: owner,
        status,
        shippingTaxable: false,
        subtotal: total,
        linesVat: 0,
        shippingVat: 0,
        total,
        firstSentAt: firstSentAt ? new Date(firstSentAt) : null,
        sentAt: firstSentAt ? new Date(firstSentAt) : null,
        expiresAt:
          status === 'DRAFT' || status === 'VOIDED' ? null : new Date('2026-11-30T00:00:00.000Z'),
      },
    });
  }

  const november = () =>
    repo.periodStats(null, bogotaDayStartUtc('2026-11-01'), bogotaDayStartUtc('2026-12-01'));

  it('counts the cohort by firstSentAt, excluding drafts and voided amounts', async () => {
    await quote('APPROVED', 1000, '2026-11-02T15:00:00.000Z');
    await quote('REJECTED', 500, '2026-11-03T15:00:00.000Z');
    await quote('EXPIRED', 300, '2026-11-04T15:00:00.000Z');
    await quote('VOIDED', 9000, '2026-11-05T15:00:00.000Z');
    await quote('DRAFT', 7000, null);
    // 2026-11-30 23:30 en Bogotá entra; 2026-12-01 00:10 en Bogotá no.
    await quote('APPROVED', 200, '2026-12-01T04:30:00.000Z');
    await quote('APPROVED', 999, '2026-12-01T05:10:00.000Z');
    // 2026-10-31 23:59 en Bogotá no entra.
    await quote('APPROVED', 888, '2026-11-01T04:59:00.000Z');

    expect(await november()).toEqual({
      approved: 2,
      rejected: 1,
      expired: 1,
      quotedAmount: '2000',
      approvedAmount: '1200',
    });
  });

  it('counts active and pending follow-up by current state with the M6 rule', async () => {
    const stale = await quote('SENT', 100, '2026-10-20T15:00:00.000Z');
    const recent = await quote('SENT', 100, '2026-10-20T15:00:00.000Z');
    await quote('SENT', 100, '2026-11-01T15:00:00.000Z');
    await quote('SENT', 100, '2026-10-01T15:00:00.000Z', otherId);
    await quote('DRAFT', 100, null);
    await prisma.interaction.create({
      data: {
        customerId,
        quoteId: recent.id,
        type: 'CALL',
        note: 'x',
        occurredAt: new Date('2026-10-31T15:00:00.000Z'),
        authorId: ownerId,
      },
    });

    // Y = 5 y hoy 2026-11-03: la de 20/10 sin contacto está pendiente; la contactada el 31/10 no; la de 01/11 no.
    expect(await repo.currentCounts(ownerId, '2026-11-03', 5)).toEqual({
      active: 3,
      pendingFollowUp: 1,
    });
    expect(await repo.currentCounts(null, '2026-11-03', 5)).toEqual({
      active: 4,
      pendingFollowUp: 2,
    });

    // Un contacto general con el cliente (sin cotización) también cuenta como seguimiento.
    await prisma.interaction.create({
      data: {
        customerId,
        type: 'EMAIL',
        note: 'x',
        occurredAt: new Date('2026-11-02T15:00:00.000Z'),
        authorId: ownerId,
      },
    });
    expect((await repo.currentCounts(ownerId, '2026-11-03', 5)).pendingFollowUp).toBe(0);
    expect(stale.status).toBe('SENT');
  });
});
