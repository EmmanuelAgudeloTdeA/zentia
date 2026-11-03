import type { ActiveStatusFilter, VatRate } from '@zentia/shared';
import type { Product } from '../../domain/index.js';

export interface NewProduct {
  name: string;
  nameKey: string;
  category: string;
  categoryKey: string;
  price: string;
  vatRate: VatRate;
}

export type ProductUpdate = Partial<NewProduct> & { isActive?: boolean };

export interface ProductSearch {
  /** Clave sin tildes contra nombre y categoría. */
  key: string | null;
  categoryKey: string | null;
  status: ActiveStatusFilter;
  skip: number;
  take: number;
}

export interface ProductRepository {
  create(product: NewProduct): Promise<Product>;
  update(id: string, changes: ProductUpdate): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findByIds(ids: readonly string[]): Promise<Product[]>;
  list(search: ProductSearch): Promise<{ items: Product[]; total: number }>;
  /** Forma escrita de la categoría con esa clave en otro producto, si existe. */
  findCategoryByKey(categoryKey: string, excludeProductId?: string): Promise<string | null>;
  suggestCategories(key: string, limit: number): Promise<string[]>;
}
