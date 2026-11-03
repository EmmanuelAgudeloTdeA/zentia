import type {
  ActiveStatusFilter,
  CreateProductRequest,
  ProductDto,
  ProductListDto,
  UpdateProductRequest,
} from '@zentia/shared';
import { request } from '../../../core/http-client';

export interface ProductsListParams {
  q?: string | undefined;
  category?: string | undefined;
  status: ActiveStatusFilter;
  page: number;
  pageSize: number;
}

export const productsService = {
  list: (query: ProductsListParams, signal?: AbortSignal) =>
    request<ProductListDto>('GET', '/products', {
      query: { ...query },
      ...(signal ? { signal } : {}),
    }),
  get: (id: string) => request<ProductDto>('GET', `/products/${id}`),
  create: (body: CreateProductRequest) => request<ProductDto>('POST', '/products', { body }),
  update: (id: string, body: UpdateProductRequest) =>
    request<ProductDto>('PATCH', `/products/${id}`, { body }),
  categories: (q: string, signal?: AbortSignal) =>
    request<string[]>('GET', '/products/categories', {
      query: { q },
      ...(signal ? { signal } : {}),
    }),
};
