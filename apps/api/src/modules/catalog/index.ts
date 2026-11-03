import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import {
  CreateProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
  RepositoryCatalogReader,
  SuggestCategoriesUseCase,
  UpdateProductUseCase,
  type CatalogInfrastructure,
  type CatalogReader,
} from './application/index.js';
import { createProductsOpenApi, createProductsRouter } from './presentation/index.js';

export type {
  CatalogInfrastructure,
  CatalogReader,
  ProductRepository,
  ProductSnapshotDto,
} from './application/index.js';
export type { Product } from './domain/index.js';
export { createPrismaCatalogInfrastructure } from './infrastructure/index.js';

export interface CatalogModuleOptions extends ModuleDependencies {
  infrastructure: CatalogInfrastructure;
}

export interface CatalogModule {
  module: ModuleDefinition;
  catalogReader: CatalogReader;
}

export function createCatalogModule({
  infrastructure,
  requireAuth,
}: CatalogModuleOptions): CatalogModule {
  return {
    catalogReader: new RepositoryCatalogReader(infrastructure),
    module: {
      name: 'catalog',
      basePath: '/products',
      router: createProductsRouter({
        list: new ListProductsUseCase(infrastructure),
        get: new GetProductUseCase(infrastructure),
        create: new CreateProductUseCase(infrastructure),
        update: new UpdateProductUseCase(infrastructure),
        suggestCategories: new SuggestCategoriesUseCase(infrastructure),
        requireAuth,
      }),
      openapi: createProductsOpenApi(),
    },
  };
}
