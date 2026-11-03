import type { Prisma, PrismaClient, Product as ProductRow } from '@prisma/client';
import type {
  CatalogInfrastructure,
  NewProduct,
  ProductRepository,
  ProductSearch,
  ProductUpdate,
} from '../application/index.js';
import type { Product } from '../domain/index.js';

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price.toFixed(0),
    vatRate: row.vatRate,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  };
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async create(product: NewProduct): Promise<Product> {
    return toProduct(await this.db.product.create({ data: product }));
  }

  async update(id: string, changes: ProductUpdate): Promise<Product> {
    return toProduct(await this.db.product.update({ where: { id }, data: changes }));
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.db.product.findUnique({ where: { id } });
    return row ? toProduct(row) : null;
  }

  async findByIds(ids: readonly string[]): Promise<Product[]> {
    const rows = await this.db.product.findMany({ where: { id: { in: [...ids] } } });
    return rows.map(toProduct);
  }

  async list({ key, categoryKey, status, skip, take }: ProductSearch) {
    const where: Prisma.ProductWhereInput = {
      ...(status === 'all' ? {} : { isActive: status === 'active' }),
      ...(categoryKey ? { categoryKey } : {}),
      ...(key ? { OR: [{ nameKey: { contains: key } }, { categoryKey: { contains: key } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.product.findMany({ where, orderBy: [{ nameKey: 'asc' }, { id: 'asc' }], skip, take }),
      this.db.product.count({ where }),
    ]);
    return { items: rows.map(toProduct), total };
  }

  async findCategoryByKey(categoryKey: string, excludeProductId?: string): Promise<string | null> {
    const row = await this.db.product.findFirst({
      where: { categoryKey, ...(excludeProductId ? { id: { not: excludeProductId } } : {}) },
      select: { category: true },
      orderBy: { createdAt: 'asc' },
    });
    return row?.category ?? null;
  }

  async suggestCategories(key: string, limit: number): Promise<string[]> {
    const rows = await this.db.product.findMany({
      where: key ? { categoryKey: { contains: key } } : {},
      distinct: ['categoryKey'],
      select: { category: true },
      orderBy: { categoryKey: 'asc' },
      take: limit,
    });
    return rows.map((row) => row.category);
  }
}

export function createPrismaCatalogInfrastructure(prisma: PrismaClient): CatalogInfrastructure {
  return { products: new PrismaProductRepository(prisma) };
}
