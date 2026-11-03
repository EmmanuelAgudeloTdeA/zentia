import { Decimal, type VatRate } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { Product } from '../domain/index.js';
import type { CatalogInfrastructure } from './catalog-dependencies.js';

export interface ProductSnapshotDto {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly price: Decimal;
  readonly vatRate: VatRate;
  readonly isActive: boolean;
}

/** Lectura del catálogo para M4 (snapshot de líneas). */
export interface CatalogReader {
  /** Para cotizaciones nuevas: lanza `PRODUCT_NOT_FOUND` o `PRODUCT_INACTIVE` con `{ productId }`. */
  getActiveByIds(ids: readonly string[]): Promise<ProductSnapshotDto[]>;
  /** Incluye inactivos (reactivar o duplicar); lanza `PRODUCT_NOT_FOUND` si falta alguno. */
  getByIds(ids: readonly string[]): Promise<ProductSnapshotDto[]>;
}

function toSnapshot(product: Product): ProductSnapshotDto {
  return Object.freeze({
    id: product.id,
    name: product.name,
    category: product.category,
    price: new Decimal(product.price),
    vatRate: product.vatRate,
    isActive: product.isActive,
  });
}

export class RepositoryCatalogReader implements CatalogReader {
  constructor(private readonly deps: CatalogInfrastructure) {}

  async getByIds(ids: readonly string[]): Promise<ProductSnapshotDto[]> {
    const unique = [...new Set(ids)];
    const found = new Map(
      (await this.deps.products.findByIds(unique)).map((product) => [product.id, product]),
    );
    return unique.map((productId) => {
      const product = found.get(productId);
      if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404, { productId });
      return toSnapshot(product);
    });
  }

  async getActiveByIds(ids: readonly string[]): Promise<ProductSnapshotDto[]> {
    const snapshots = await this.getByIds(ids);
    const inactive = snapshots.find((product) => !product.isActive);
    if (inactive) throw new AppError('PRODUCT_INACTIVE', 409, { productId: inactive.id });
    return snapshots;
  }
}
