import {
  categorySuggestionsQuerySchema,
  createProductRequestSchema,
  listProductsQuerySchema,
  updateProductRequestSchema,
} from '@zentia/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type {
  CreateProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
  SuggestCategoriesUseCase,
  UpdateProductUseCase,
} from '../application/index.js';

export interface ProductsRouterDependencies {
  list: ListProductsUseCase;
  get: GetProductUseCase;
  create: CreateProductUseCase;
  update: UpdateProductUseCase;
  suggestCategories: SuggestCategoriesUseCase;
  requireAuth: RequireAuth;
}

const idSchema = z.uuid();

/** Un id mal formado equivale a un producto inexistente. */
function productId(req: Request): string {
  const parsed = idSchema.safeParse(req.params['id']);
  if (!parsed.success) throw new AppError('PRODUCT_NOT_FOUND', 404);
  return parsed.data;
}

export function createProductsRouter(deps: ProductsRouterDependencies): Router {
  const router = Router();
  const authenticated = deps.requireAuth();
  const adminOnly = deps.requireAuth({ roles: ['ADMIN'] });

  router.get('/', authenticated, async (req, res) => {
    if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
    res.json(await deps.list.execute(req.actor, listProductsQuerySchema.parse(req.query)));
  });

  router.get('/categories', authenticated, async (req, res) => {
    const { q } = categorySuggestionsQuerySchema.parse(req.query);
    res.json(await deps.suggestCategories.execute(q));
  });

  router.get('/:id', authenticated, async (req, res) => {
    res.json(await deps.get.execute(productId(req)));
  });

  router.post('/', adminOnly, async (req, res) => {
    res.status(201).json(await deps.create.execute(createProductRequestSchema.parse(req.body)));
  });

  router.patch('/:id', adminOnly, async (req, res) => {
    const id = productId(req);
    res.json(await deps.update.execute(id, updateProductRequestSchema.parse(req.body)));
  });

  return router;
}
