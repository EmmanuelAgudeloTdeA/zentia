import {
  CATEGORY_SUGGESTIONS_LIMIT,
  toSearchKey,
  type ProductChanges,
  type ProductDto,
  type ProductInput,
  type ProductListDto,
  type ProductListFilter,
} from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { Actor } from '../../auth/index.js';
import { resolveCategory, type Product } from '../domain/index.js';
import type { CatalogInfrastructure } from './catalog-dependencies.js';
import type { ProductUpdate } from './ports/index.js';

type Deps = CatalogInfrastructure;

export function toProductDto(product: Product): ProductDto {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    vatRate: product.vatRate,
    isActive: product.isActive,
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function categoryFor(deps: Deps, label: string, productId?: string) {
  const key = toSearchKey(label);
  return resolveCategory(label, await deps.products.findCategoryByKey(key, productId));
}

export class CreateProductUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(input: ProductInput): Promise<ProductDto> {
    const product = await this.deps.products.create({
      name: input.name,
      nameKey: toSearchKey(input.name),
      ...(await categoryFor(this.deps, input.category)),
      price: input.price,
      vatRate: input.vatRate,
    });
    return toProductDto(product);
  }
}

export class UpdateProductUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(id: string, changes: ProductChanges): Promise<ProductDto> {
    if (!(await this.deps.products.findById(id))) throw new AppError('PRODUCT_NOT_FOUND', 404);
    const update: ProductUpdate = {};
    if (changes.name !== undefined) {
      update.name = changes.name;
      update.nameKey = toSearchKey(changes.name);
    }
    if (changes.category !== undefined) {
      Object.assign(update, await categoryFor(this.deps, changes.category, id));
    }
    if (changes.price !== undefined) update.price = changes.price;
    if (changes.vatRate !== undefined) update.vatRate = changes.vatRate;
    if (changes.isActive !== undefined) update.isActive = changes.isActive;
    return toProductDto(await this.deps.products.update(id, update));
  }
}

export class GetProductUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(id: string): Promise<ProductDto> {
    const product = await this.deps.products.findById(id);
    if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404);
    return toProductDto(product);
  }
}

export class ListProductsUseCase {
  constructor(private readonly deps: Deps) {}

  /** Vendedor y gerente solo ven productos activos, sin importar el filtro enviado. */
  async execute(actor: Actor, filter: ProductListFilter): Promise<ProductListDto> {
    const { q, category, page, pageSize } = filter;
    const result = await this.deps.products.list({
      key: q ? toSearchKey(q) || null : null,
      categoryKey: category ? toSearchKey(category) || null : null,
      status: actor.role === 'ADMIN' ? filter.status : 'active',
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: result.items.map(toProductDto), total: result.total, page, pageSize };
  }
}

export class SuggestCategoriesUseCase {
  constructor(private readonly deps: Deps) {}

  execute(q: string | undefined): Promise<string[]> {
    return this.deps.products.suggestCategories(toSearchKey(q ?? ''), CATEGORY_SUGGESTIONS_LIMIT);
  }
}
