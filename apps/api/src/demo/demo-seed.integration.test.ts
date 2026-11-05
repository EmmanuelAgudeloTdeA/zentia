import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertDemoSeedAllowed, DemoSeedRefusedError, seedDemoData } from './demo-seed.js';

describe('assertDemoSeedAllowed', () => {
  it('refuses production unless ALLOW_DEMO_SEED is true', () => {
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'production' })).toThrow(DemoSeedRefusedError);
    expect(() =>
      assertDemoSeedAllowed({ NODE_ENV: 'production', ALLOW_DEMO_SEED: 'true' }),
    ).not.toThrow();
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'development' })).not.toThrow();
  });
});

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('seedDemoData (integration)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.interaction.deleteMany();
    await prisma.quoteEvent.deleteMany();
    await prisma.quoteVersion.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: { email: 'v@e.co', name: 'Vendedora', passwordHash: 'h', role: 'SELLER' },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('creates marked data once, with several states and consistent totals', async () => {
    const result = await seedDemoData(prisma, new Date('2026-11-03T15:00:00.000Z'));
    expect(result).toMatchObject({ skipped: false, customers: 8, products: 8, quotes: 48 });

    const customers = await prisma.customer.findMany();
    expect(
      customers.every((c) => c.documentId.startsWith('DEMO') && c.name.startsWith('[DEMO]')),
    ).toBe(true);
    expect((await prisma.product.findMany()).every((p) => p.name.startsWith('[DEMO]'))).toBe(true);
    const statuses = new Set(
      (await prisma.quote.findMany({ select: { status: true } })).map((q) => q.status),
    );
    expect(statuses.size).toBeGreaterThanOrEqual(5);
    const nonDraftsWithoutExpiry = await prisma.quote.count({
      where: { status: { notIn: ['DRAFT', 'VOIDED'] }, expiresAt: null },
    });
    expect(nonDraftsWithoutExpiry).toBe(0);

    expect(await seedDemoData(prisma)).toMatchObject({ skipped: true });
    expect(await prisma.quote.count()).toBe(48);
  });

  it('records the void reason, keeps interactions after the send and expires on the Bogotá day', async () => {
    const voided = await prisma.quote.findMany({
      where: { status: 'VOIDED' },
      include: { events: true },
    });
    expect(voided.length).toBeGreaterThan(0);
    for (const quote of voided) {
      const event = quote.events.find(
        (item) =>
          item.type === 'STATE_CHANGED' && (item.data as { to?: string } | null)?.to === 'VOIDED',
      );
      expect(event?.note).toBeTruthy();
    }

    const interactions = await prisma.interaction.findMany({ include: { quote: true } });
    const now = new Date('2026-11-03T15:00:00.000Z');
    for (const interaction of interactions) {
      expect(interaction.quote?.sentAt).toBeTruthy();
      expect(interaction.occurredAt.getTime()).toBeGreaterThanOrEqual(
        interaction.quote!.sentAt!.getTime(),
      );
      expect(interaction.occurredAt.getTime()).toBeLessThanOrEqual(now.getTime());
    }

    const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
    const validityDays = settings?.validityDays ?? 15;
    const bogotaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' });
    const sent = await prisma.quote.findMany({ where: { sentAt: { not: null } } });
    expect(sent.length).toBeGreaterThan(0);
    for (const quote of sent) {
      const expected = new Date(`${bogotaDay.format(quote.sentAt!)}T00:00:00.000Z`);
      expected.setUTCDate(expected.getUTCDate() + validityDays);
      expect(quote.expiresAt?.toISOString().slice(0, 10)).toBe(expected.toISOString().slice(0, 10));
    }
  });
});
