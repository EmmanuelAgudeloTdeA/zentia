export type { CatalogInfrastructure } from './catalog-dependencies.js';
export {
  RepositoryCatalogReader,
  type CatalogReader,
  type ProductSnapshotDto,
} from './catalog-reader.js';
export type * from './ports/index.js';
export {
  CreateProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
  SuggestCategoriesUseCase,
  toProductDto,
  UpdateProductUseCase,
} from './product-use-cases.js';
