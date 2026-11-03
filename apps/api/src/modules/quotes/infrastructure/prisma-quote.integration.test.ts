import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { NewQuote } from '../application/index.js';
import {
  createPrismaQuotesInfrastructure,
  PrismaQuoteRepository,
} from './prisma-quote.repository.js';
import { createPrismaAuthInfrastructure } from '../../auth/index.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Prisma quotes (integration)', () => {
  let prisma: PrismaClient;
  let infra: ReturnType<typeof createPrismaQuotesInfrastructure>;
  let base: Omit<NewQuote, 'number'>;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
    const auth = createPrismaAuthInfrastructure(prisma, {
      jwtAccessSecret: 'integration-secret-with-32-characters!',
      accessTokenTtlSeconds: 900,
      bcryptCost: 4,
    });
    infra = createPrismaQuotesInfrastructure(prisma, auth.users);
  });

  beforeEach(async () => {
    await prisma.quoteEvent.deleteMany();
    await prisma.quoteVersion.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.quoteSequence.update({ where: { key: 'QUOTE' }, data: { lastValue: 0 } });
    const user = await prisma.user.create({
      data: { email: 'ana@empresa.co', name: 'Ana', passwordHash: 'h', role: 'SELLER' },
    });
    const customer = await prisma.customer.create({
      data: {
        name: 'Acme',
        nameKey: 'acme',
        documentId: '900123',
        email: 'a@b.co',
        createdById: user.id,
      },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Portátil',
        nameKey: 'portatil',
        category: 'Tecnología',
        categoryKey: 'tecnologia',
        price: '2500000',
        vatRate: 'GENERAL_19',
      },
    });
    base = {
      customerId: customer.id,
      ownerId: user.id,
      createdById: user.id,
      shippingTaxable: false,
      discountPct: '0',
      discountAmount: '0',
      shippingAmount: '0',
      subtotal: '2500000',
      linesVat: '475000',
      shippingVat: '0',
      total: '2975000',
      items: [
        {
          productId: product.id,
          position: 1,
          productName: 'Portátil',
          category: 'Tecnología',
          unitPrice: '2500000',
          vatRate: 'GENERAL_19',
          quantity: '1.5',
          lineAmount: '3750000',
        },
      ],
    };
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const createInTx = () =>
    infra.unitOfWork.run(async (tx) =>
      tx.quotes.create({ ...base, number: await tx.sequence.next() }),
    );

  it('gives 50 concurrent creations 50 consecutive numbers', async () => {
    await Promise.all(Array.from({ length: 50 }, () => createInTx()));
    const numbers = (await prisma.quote.findMany({ select: { number: true } }))
      .map((quote) => quote.number)
      .sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
  }, 30_000);

  it('does not consume a number when the transaction rolls back', async () => {
    await expect(
      infra.unitOfWork.run(async (tx) => {
        await tx.sequence.next();
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await createInTx();
    expect((await prisma.quote.findFirst())?.number).toBe(1);
  });

  it('maps decimals, enforces CHECKs and expires due quotes once', async () => {
    const id = await createInTx();
    const repo = new PrismaQuoteRepository(prisma);
    const quote = await repo.findById(id);
    expect(quote?.items[0]).toMatchObject({ quantity: '1.5', unitPrice: '2500000' });
    expect(quote?.discountPct).toBe('0');
    await expect(repo.update(id, { status: 'SENT' })).rejects.toThrow();

    await repo.update(id, { status: 'SENT', expiresAt: '2026-11-02' });
    expect(await repo.expireDue('2026-11-03')).toEqual([id]);
    expect(await repo.expireDue('2026-11-03')).toEqual([]);
    expect((await repo.findById(id))?.status).toBe('EXPIRED');
  });

  it('derives voidReason and stores versions and events', async () => {
    const id = await createInTx();
    const repo = new PrismaQuoteRepository(prisma);
    const author = (await prisma.user.findFirstOrThrow()).id;
    const versionId = await repo.addVersion({
      quoteId: id,
      number: 1,
      snapshot: { total: '2975000' } as never,
      changes: null,
      customerRequest: null,
      authorId: author,
    });
    await repo.addEvents([
      {
        quoteId: id,
        type: 'STATE_CHANGED',
        actorId: author,
        versionId,
        data: { from: 'DRAFT', to: 'VOIDED' },
        note: 'Motivo',
      },
      { quoteId: id, type: 'STATE_CHANGED', actorId: null, data: { from: 'SENT', to: 'EXPIRED' } },
    ]);
    await repo.update(id, { status: 'VOIDED' });
    // Un Borrador anulado no tiene vencimiento: el CHECK lo admite.
    expect((await repo.findById(id))?.voidReason).toBe('Motivo');
    const history = await repo.history(id);
    expect(history.versions[0]).toMatchObject({
      number: 1,
      total: '2975000',
      author: { name: 'Ana' },
    });
    expect(history.events.map((event) => event.actor?.name ?? null)).toEqual(['Ana', null]);
  });
});
