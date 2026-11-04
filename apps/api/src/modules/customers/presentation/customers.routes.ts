import {
  createCustomerRequestSchema,
  documentMatchesQuerySchema,
  listCustomersQuerySchema,
  updateCustomerRequestSchema,
} from '@zentia/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type {
  CreateCustomerUseCase,
  FindDocumentMatchesUseCase,
  GetCustomerUseCase,
  SearchCustomersUseCase,
  UpdateCustomerUseCase,
} from '../application/index.js';

export interface CustomersRouterDependencies {
  search: SearchCustomersUseCase;
  get: GetCustomerUseCase;
  documentMatches: FindDocumentMatchesUseCase;
  create: CreateCustomerUseCase;
  update: UpdateCustomerUseCase;
  requireAuth: RequireAuth;
}

const idSchema = z.uuid();

/** Un id mal formado equivale a un cliente inexistente. */
function customerId(req: Request): string {
  const parsed = idSchema.safeParse(req.params['id']);
  if (!parsed.success) throw new AppError('CUSTOMER_NOT_FOUND', 404);
  return parsed.data;
}

export function createCustomersRouter(deps: CustomersRouterDependencies): Router {
  const router = Router();
  router.use(deps.requireAuth());

  router.get('/', async (req, res) => {
    res.json(await deps.search.execute(listCustomersQuerySchema.parse(req.query)));
  });

  router.get('/document-matches', async (req, res) => {
    const { documentId } = documentMatchesQuerySchema.parse(req.query);
    res.json(await deps.documentMatches.execute(documentId));
  });

  router.get('/:id', async (req, res) => {
    res.json(await deps.get.execute(customerId(req)));
  });

  router.post('/', async (req, res) => {
    if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
    const input = createCustomerRequestSchema.parse(req.body);
    res.status(201).json(await deps.create.execute(req.actor.id, input));
  });

  router.patch('/:id', async (req, res) => {
    const id = customerId(req);
    res.json(await deps.update.execute(id, updateCustomerRequestSchema.parse(req.body)));
  });

  return router;
}
