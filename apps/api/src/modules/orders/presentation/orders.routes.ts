import { changeOrderStatusRequestSchema, listOrdersQuerySchema } from '@zentia/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { Actor } from '../../auth/index.js';
import type {
  ChangeOrderStatusUseCase,
  ConvertQuoteToOrderUseCase,
  GetOrderUseCase,
  GetQuoteOrderUseCase,
  ListOrdersUseCase,
} from '../application/index.js';

const idSchema = z.uuid();

function idParam(req: Request, notFound: 'ORDER_NOT_FOUND' | 'QUOTE_NOT_FOUND'): string {
  const parsed = idSchema.safeParse(req.params['id']);
  if (!parsed.success) throw new AppError(notFound, 404);
  return parsed.data;
}

function actorOf(req: Request): Actor {
  if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
  return req.actor;
}

export function createOrdersRouter(deps: {
  list: ListOrdersUseCase;
  get: GetOrderUseCase;
  changeStatus: ChangeOrderStatusUseCase;
  requireAuth: RequireAuth;
}): Router {
  const router = Router();
  router.use(deps.requireAuth());
  router.get('/', async (req, res) => {
    res.json(await deps.list.execute(actorOf(req), listOrdersQuerySchema.parse(req.query)));
  });
  router.get('/:id', async (req, res) => {
    res.json(await deps.get.execute(actorOf(req), idParam(req, 'ORDER_NOT_FOUND')));
  });
  router.post('/:id/status', async (req, res) => {
    const id = idParam(req, 'ORDER_NOT_FOUND');
    const input = changeOrderStatusRequestSchema.parse(req.body);
    res.json(await deps.changeStatus.execute(actorOf(req), id, input));
  });
  return router;
}

/** Se monta bajo `/quotes`: `POST /quotes/:id/order` y `GET /quotes/:id/order`. */
export function createQuoteOrderRouter(deps: {
  convert: ConvertQuoteToOrderUseCase;
  getByQuote: GetQuoteOrderUseCase;
  requireAuth: RequireAuth;
}): Router {
  const router = Router();
  const authenticated = deps.requireAuth();
  router.post('/:id/order', authenticated, async (req, res) => {
    res.status(201).json(await deps.convert.execute(actorOf(req), idParam(req, 'QUOTE_NOT_FOUND')));
  });
  router.get('/:id/order', authenticated, async (req, res) => {
    res.json(await deps.getByQuote.execute(actorOf(req), idParam(req, 'QUOTE_NOT_FOUND')));
  });
  return router;
}
