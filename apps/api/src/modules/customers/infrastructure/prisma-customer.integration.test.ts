import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { customerSearchTerms } from '../domain/index.js';
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

    const results = await Promise.allSettled([
      customers.create({ ...base(), documentId: '555555' }),
      customers.create({ ...base(), documentId: '555555' }),
    ]);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    await expect(customers.create(base())).rejects.toMatchObject({
      code: 'CUSTOMER_DOCUMENT_TAKEN',
    });
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
