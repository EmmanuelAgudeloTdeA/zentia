import type { ProductRepository } from './ports/index.js';

export interface CatalogInfrastructure {
  products: ProductRepository;
}
