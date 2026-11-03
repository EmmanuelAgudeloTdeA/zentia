import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../../core/http/index.js';
import { createInMemoryCatalog, type InMemoryCatalog } from '../../../test/in-memory-catalog.js';
import type { Actor } from '../../auth/index.js';
import { RepositoryCatalogReader } from './catalog-reader.js';
import {
  CreateProductUseCase,
  ListProductsUseCase,
  SuggestCategoriesUseCase,
  UpdateProductUseCase,
} from './product-use-cases.js';

let catalog: InMemoryCatalog;
const admin: Actor = { id: 'a', role: 'ADMIN', mustChangePassword: false };
const seller: Actor = { id: 's', role: 'SELLER', mustChangePassword: false };

beforeEach(() => {
  catalog = createInMemoryCatalog();
});

async function expectCode(promise: Promise<unknown>, code: string, status: number) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code, status });
}

function create(name: string, category: string, price = '1000') {
  return new CreateProductUseCase(catalog).execute({
    name,
    category,
    price,
    vatRate: 'GENERAL_19',
  });
}

describe('product categories', () => {
  it('reuses the written form of an equivalent category', async () => {
    await create('Portátil', 'Tecnología');
    expect((await create('Mouse', 'TECNOLOGIA')).category).toBe('Tecnología');
  });

  it('lets the only product of a category fix its written form', async () => {
    const product = await create('Portátil', 'tecnologia');
    const updated = await new UpdateProductUseCase(catalog).execute(product.id, {
      category: 'Tecnología',
    });
    expect(updated.category).toBe('Tecnología');
  });

  it('suggests up to 10 distinct categories without accents', async () => {
    for (let i = 0; i < 12; i++) await create(`P${i}`, `Categoría ${String(i).padStart(2, '0')}`);
    await create('Otro', 'categoria 00');
    const suggestions = await new SuggestCategoriesUseCase(catalog).execute('categoria');
    expect(suggestions).toHaveLength(10);
    expect(suggestions[0]).toBe('Categoría 00');
  });
});

describe('ListProductsUseCase', () => {
  it('forces active products for non admins', async () => {
    const product = await create('Viejo', 'Varios');
    await create('Nuevo', 'Varios');
    await new UpdateProductUseCase(catalog).execute(product.id, { isActive: false });
    const list = new ListProductsUseCase(catalog);
    const filter = { status: 'inactive', page: 1, pageSize: 20 } as const;

    expect((await list.execute(admin, filter)).items.map((p) => p.name)).toEqual(['Viejo']);
    expect((await list.execute(seller, filter)).items.map((p) => p.name)).toEqual(['Nuevo']);
  });

  it('searches by name or category key and filters by category', async () => {
    await create('Cámara', 'Fotografía');
    await create('Trípode', 'Accesorios');
    const list = new ListProductsUseCase(catalog);
    const names = async (q?: string, category?: string) =>
      (
        await list.execute(admin, { q, category, status: 'active', page: 1, pageSize: 20 })
      ).items.map((p) => p.name);

    expect(await names('camara')).toEqual(['Cámara']);
    expect(await names('FOTO')).toEqual(['Cámara']);
    expect(await names(undefined, 'accesorios')).toEqual(['Trípode']);
  });
});

describe('RepositoryCatalogReader', () => {
  it('returns snapshots with Decimal prices and rejects inactive or unknown ids', async () => {
    const active = await create('Activo', 'Varios', '1550000');
    const inactive = await create('Inactivo', 'Varios');
    await new UpdateProductUseCase(catalog).execute(inactive.id, { isActive: false });
    const reader = new RepositoryCatalogReader(catalog);

    const [snapshot] = await reader.getActiveByIds([active.id, active.id]);
    expect(snapshot?.price.toFixed(0)).toBe('1550000');
    expect(await reader.getByIds([inactive.id])).toHaveLength(1);
    await expectCode(reader.getActiveByIds([active.id, inactive.id]), 'PRODUCT_INACTIVE', 409);
    const missing = await reader.getByIds(['missing']).catch((e: unknown) => e);
    expect(missing).toMatchObject({ code: 'PRODUCT_NOT_FOUND', params: { productId: 'missing' } });
  });

  it('answers PRODUCT_NOT_FOUND on update', async () => {
    await expectCode(
      new UpdateProductUseCase(catalog).execute('missing', { name: 'X' }),
      'PRODUCT_NOT_FOUND',
      404,
    );
  });
});
