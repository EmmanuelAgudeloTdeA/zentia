import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '@zentia/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CATALOG_DOCUMENT_PREFIX, seedDemoCatalog } from './catalog-seed.js';
import { DEMO_PREFIX, seedDemoData } from './demo-seed.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('seedDemoCatalog (integration)', () => {
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
      data: { email: 'a@e.co', name: 'Admin', passwordHash: 'h', role: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates marked customers and products once and only fills what is missing', async () => {
    const first = await seedDemoCatalog(prisma);
    expect(first.customers).toBeGreaterThanOrEqual(40);
    expect(first.products).toBeGreaterThanOrEqual(60);

    const customers = await prisma.customer.findMany();
    expect(customers.every((c) => c.name.startsWith(DEMO_PREFIX))).toBe(true);
    expect(customers.every((c) => c.documentId.startsWith(CATALOG_DOCUMENT_PREFIX))).toBe(true);
    expect(customers.every((c) => c.phone !== null || c.email !== null)).toBe(true);
    for (const c of customers) if (c.phone) expect(normalizePhone(c.phone)).toBe(c.phone);
    const products = await prisma.product.findMany();
    expect(products.every((p) => p.name.startsWith(DEMO_PREFIX) && p.price.gt(0))).toBe(true);

    expect(await seedDemoCatalog(prisma)).toEqual({ customers: 0, products: 0 });
    const victim = customers[0]!;
    await prisma.customer.delete({ where: { id: victim.id } });
    expect(await seedDemoCatalog(prisma)).toEqual({ customers: 1, products: 0 });
  });

  it('does not stop the 6-month demo from loading afterwards', async () => {
    const demo = await seedDemoData(prisma, new Date('2026-11-04T15:00:00.000Z'));
    expect(demo.skipped).toBe(false);
    expect(demo.quotes).toBeGreaterThan(0);
  });
});
