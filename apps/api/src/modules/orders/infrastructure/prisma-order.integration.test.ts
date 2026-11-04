import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaOrderRepository } from './prisma-order.repository.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaOrderRepository (integration)', () => {
  let prisma: PrismaClient;
  let quoteId: string;
  let userId: string;
  let productId: string;

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
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    const user = await prisma.user.create({
      data: { email: 'ana@empresa.co', name: 'Ana', passwordHash: 'h', role: 'SELLER' },
    });
    userId = user.id;
    const customer = await prisma.customer.create({
      data: {
        name: 'Acme',
        nameKey: 'acme',
        documentId: '900123',
        email: 'a@b.co',
        createdById: userId,
      },
    });
    const product = await prisma.product.create({
      data: {
        name: 'P',
        nameKey: 'p',
        category: 'C',
        categoryKey: 'c',
        price: '1000',
        vatRate: 'GENERAL_19',
      },
    });
    productId = product.id;
    const quote = await prisma.quote.create({
      data: {
        number: 12,
        customerId: customer.id,
        ownerId: userId,
        createdById: userId,
        status: 'APPROVED',
        shippingTaxable: false,
        subtotal: 1500,
        linesVat: 285,
        shippingVat: 0,
        total: 1785,
        expiresAt: new Date('2026-11-20T00:00:00.000Z'),
      },
    });
    quoteId = quote.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const newOrder = () => ({
    quoteId,
    createdById: userId,
    discountPct: '0',
    discountAmount: '0',
    subtotal: '1500',
    linesVat: '285',
    shippingAmount: '0',
    shippingVat: '0',
    total: '1785',
    items: [
      {
        productId,
        position: 1,
        productName: 'P',
        category: 'C',
        unitPrice: '1000',
        vatRate: 'GENERAL_19' as const,
        quantity: '1.5',
        lineAmount: '1500',
      },
    ],
  });

  it('allows a single order per quote under concurrency and maps decimals', async () => {
    const repo = new PrismaOrderRepository(prisma);
    const results = await Promise.allSettled([repo.create(newOrder()), repo.create(newOrder())]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected && 'reason' in rejected ? rejected.reason : null).toMatchObject({
      code: 'ORDER_ALREADY_EXISTS',
    });
    const order = await repo.findByQuoteId(quoteId);
    expect(order).toMatchObject({
      total: '1785',
      quote: { number: 12 },
      owner: { name: 'Ana' },
      customer: { name: 'Acme' },
    });
    expect(order?.items[0]).toMatchObject({ quantity: '1.5', unitPrice: '1000' });
  });

  it('updates the status only with the expected updatedAt and enforces the reason CHECK', async () => {
    const repo = new PrismaOrderRepository(prisma);
    const id = await repo.create(newOrder());
    const order = await repo.findById(id);
    if (!order) throw new Error('missing order');
    await expect(
      repo.updateStatus(id, new Date('2020-01-01'), { status: 'IN_PROGRESS' }),
    ).resolves.toBe(false);
    await expect(
      repo.updateStatus(id, order.updatedAt, { status: 'IN_PROGRESS', inProgressAt: new Date() }),
    ).resolves.toBe(true);
    await expect(
      prisma.order.update({ where: { id }, data: { cancelReason: 'x' } }),
    ).rejects.toThrow();
  });
});
