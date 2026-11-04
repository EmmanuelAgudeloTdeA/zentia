import { randomUUID } from 'node:crypto';
import type {
  CatalogInfrastructure,
  Product,
  ProductRepository,
} from '../modules/catalog/index.js';

type Stored = Product & { nameKey: string; categoryKey: string; createdAt: Date };

export class InMemoryProductRepository implements ProductRepository {
  readonly products = new Map<string, Stored>();

  private toProduct({ nameKey: _n, categoryKey: _c, createdAt: _d, ...product }: Stored): Product {
    return product;
  }

  async create(input: Parameters<ProductRepository['create']>[0]): Promise<Product> {
    const now = new Date(Date.now() + this.products.size);
    const stored: Stored = {
      ...input,
      id: randomUUID(),
      isActive: true,
      updatedAt: now,
      createdAt: now,
    };
    this.products.set(stored.id, stored);
    return this.toProduct(stored);
  }

  async update(id: string, changes: Parameters<ProductRepository['update']>[1]) {
    const current = this.products.get(id);
    if (!current) throw new Error(`Product ${id} not found`);
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    const updated: Stored = { ...current, ...defined, updatedAt: new Date() };
    this.products.set(id, updated);
    return this.toProduct(updated);
  }

  async findById(id: string) {
    const stored = this.products.get(id);
    return stored ? this.toProduct(stored) : null;
  }

  async findByIds(ids: readonly string[]) {
    return ids.flatMap((id) => {
      const stored = this.products.get(id);
      return stored ? [this.toProduct(stored)] : [];
    });
  }

  async list({ key, categoryKey, status, skip, take }: Parameters<ProductRepository['list']>[0]) {
    const matches = [...this.products.values()]
      .filter((p) => status === 'all' || p.isActive === (status === 'active'))
      .filter((p) => !categoryKey || p.categoryKey === categoryKey)
      .filter((p) => !key || p.nameKey.includes(key) || p.categoryKey.includes(key))
      .sort((a, b) => a.nameKey.localeCompare(b.nameKey) || a.id.localeCompare(b.id));
    return {
      items: matches.slice(skip, skip + take).map((p) => this.toProduct(p)),
      total: matches.length,
    };
  }

  async findCategoryByKey(categoryKey: string, excludeProductId?: string) {
    const match = [...this.products.values()]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .find((p) => p.categoryKey === categoryKey && p.id !== excludeProductId);
    return match?.category ?? null;
  }

  async suggestCategories(key: string, limit: number) {
    const byKey = new Map<string, string>();
    for (const p of this.products.values()) {
      if (p.categoryKey.includes(key) && !byKey.has(p.categoryKey)) {
        byKey.set(p.categoryKey, p.category);
      }
    }
    return [...byKey.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, limit)
      .map(([, category]) => category);
  }
}

export interface InMemoryCatalog extends CatalogInfrastructure {
  products: InMemoryProductRepository;
}

export function createInMemoryCatalog(): InMemoryCatalog {
  return { products: new InMemoryProductRepository() };
}
