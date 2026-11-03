import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaProductRepository } from './prisma-product.repository.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaProductRepository (integration)', () => {
  let prisma: PrismaClient;
  let products: PrismaProductRepository;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
    products = new PrismaProductRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const product = (name: string, category: string, price = '1550000') => ({
    name,
    nameKey: name.toLowerCase(),
    category,
    categoryKey: category.toLowerCase(),
    price,
    vatRate: 'GENERAL_19' as const,
  });

  it('maps Decimal prices to canonical strings and enforces price > 0', async () => {
    const created = await products.create(product('portatil', 'Tecnologia', '999999999999999'));
    expect(created.price).toBe('999999999999999');
    await expect(products.create(product('gratis', 'Varios', '0'))).rejects.toThrow();
  });

  it('suggests distinct categories and finds the written form by key', async () => {
    await products.create(product('a', 'Tecnologia'));
    await products.create(product('b', 'Tecnologia'));
    await products.create(product('c', 'Servicios'));
    expect(await products.suggestCategories('', 10)).toEqual(['Servicios', 'Tecnologia']);
    expect(await products.findCategoryByKey('tecnologia')).toBe('Tecnologia');
    expect(await products.findByIds([])).toEqual([]);
  });
});
