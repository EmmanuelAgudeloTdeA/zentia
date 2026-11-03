import { z } from 'zod';
import { normalizeCategoryLabel } from '../normalize/index.js';
import { vatRateSchema } from './company-settings.schema.js';
import { positiveMoneyString } from './decimal.schema.js';
import { activeStatusFilterSchema, paginationQueryShape } from './pagination.schema.js';

export const PRODUCT_NAME_MAX_LENGTH = 150;
export const CATEGORY_MAX_LENGTH = 80;
export const CATEGORY_SUGGESTIONS_LIMIT = 10;

const categorySchema = z
  .string()
  .transform(normalizeCategoryLabel)
  .pipe(z.string().min(1).max(CATEGORY_MAX_LENGTH));

const productShape = {
  name: z.string().trim().min(1).max(PRODUCT_NAME_MAX_LENGTH),
  category: categorySchema,
  /** COP sin IVA, entero mayor que 0. */
  price: positiveMoneyString,
  vatRate: vatRateSchema,
};

export const createProductRequestSchema = z.object(productShape);

export type CreateProductRequest = z.input<typeof createProductRequestSchema>;
export type ProductInput = z.output<typeof createProductRequestSchema>;

export const updateProductRequestSchema = z
  .object({ ...productShape, isActive: z.boolean() })
  .partial();

export type UpdateProductRequest = z.input<typeof updateProductRequestSchema>;
export type ProductChanges = z.output<typeof updateProductRequestSchema>;

export const listProductsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(CATEGORY_MAX_LENGTH).optional(),
  status: activeStatusFilterSchema.default('active'),
  ...paginationQueryShape,
});

export type ListProductsQuery = z.input<typeof listProductsQuerySchema>;
export type ProductListFilter = z.output<typeof listProductsQuerySchema>;

export const categorySuggestionsQuerySchema = z.object({
  q: z.string().trim().max(CATEGORY_MAX_LENGTH).optional(),
});

export const productDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.string(),
  price: z.string(),
  vatRate: vatRateSchema,
  isActive: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export type ProductDto = z.infer<typeof productDtoSchema>;

export const productListDtoSchema = z.object({
  items: z.array(productDtoSchema),
  total: z.int(),
  page: z.int(),
  pageSize: z.int(),
});

export type ProductListDto = z.infer<typeof productListDtoSchema>;
