import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { customerSearchTerms, documentIdPrefixes } from '../domain/index.js';
import { PrismaCustomerRepository } from './prisma-customer.repository.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaCustomerRepository (integration)', () => {
  let prisma: PrismaClient;
  let customers: PrismaCustomerRepository;
  let userId: string;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
    customers = new PrismaCustomerRepository(prisma);
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
    const user = await prisma.user.create({
      data: { email: 'ana@empresa.co', name: 'Ana', passwordHash: 'h', role: 'SELLER' },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const base = () => ({
    name: 'José Pérez',
    nameKey: 'jose perez',
    documentId: '9001234567',
    phone: '573001234567',
    email: null,
    createdById: userId,
  });

  it('includes the creator and maps a duplicated document to CUSTOMER_DOCUMENT_TAKEN', async () => {
    const created = await customers.create(base());
    expect(created.createdBy).toEqual({ id: userId, name: 'Ana' });

    await expect(customers.create(base())).rejects.toMatchObject({
      code: 'CUSTOMER_DOCUMENT_TAKEN',
    });
  });

  it('lets only one of two concurrent creates with the same document succeed', async () => {
    const results = await Promise.allSettled([
      customers.create({ ...base(), documentId: '555555' }),
      customers.create({ ...base(), documentId: '555555' }),
    ]);
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({ code: 'CUSTOMER_DOCUMENT_TAKEN', status: 409 });
  });

  it('finds document matches in both directions and orders repeated names by id', async () => {
    const short = await customers.create({ ...base(), documentId: '900123456' });
    const long = await customers.create({ ...base(), documentId: '9009999999' });
    expect(
      (
        await customers.findDocumentMatches('9001234567', documentIdPrefixes('9001234567') ?? [], 5)
      ).map((c) => c.id),
    ).toEqual([short.id]);
    expect((await customers.findDocumentMatches('90099', [], 5)).map((c) => c.id)).toEqual([
      long.id,
    ]);

    const page = async (skip: number) =>
      (await customers.search({ terms: null, status: 'all', skip, take: 1 })).items[0]?.id;
    const ids = [await page(0), await page(1)];
    expect(ids).toEqual([short.id, long.id].sort());
  });

  it('enforces the contact CHECK', async () => {
    await expect(customers.create({ ...base(), phone: null, email: null })).rejects.toThrow();
  });

  it('searches by name key, document and phone', async () => {
    await customers.create(base());
    const search = async (q: string) =>
      (
        await customers.search({
          terms: customerSearchTerms(q),
          status: 'active',
          skip: 0,
          take: 10,
        })
      ).total;
    expect(await search('JOSE')).toBe(1);
    expect(await search('900.123')).toBe(1);
    expect(await search('300 123')).toBe(1);
    expect(await search('maria')).toBe(0);
  });
});
