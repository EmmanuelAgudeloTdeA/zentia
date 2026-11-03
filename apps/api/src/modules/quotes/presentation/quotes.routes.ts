import {
  changeExpiryRequestSchema,
  changeQuoteStatusRequestSchema,
  createQuoteRequestSchema,
  listQuotesQuerySchema,
  quoteMutationSchema,
  reactivateQuoteRequestSchema,
  reassignQuoteRequestSchema,
  updateQuoteRequestSchema,
  voidQuoteRequestSchema,
} from '@zentia/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { Actor } from '../../auth/index.js';
import type {
  ChangeExpiryUseCase,
  ChangeQuoteStatusUseCase,
  CreateQuoteUseCase,
  DuplicateQuoteUseCase,
  GetQuoteHistoryUseCase,
  GetQuoteUseCase,
  GetReactivationPreviewUseCase,
  ListQuotesUseCase,
  ReactivateQuoteUseCase,
  ReassignQuoteUseCase,
  SendQuoteUseCase,
  UpdateQuoteUseCase,
  VoidQuoteUseCase,
} from '../application/index.js';

export interface QuotesRouterDependencies {
  list: ListQuotesUseCase;
  get: GetQuoteUseCase;
  history: GetQuoteHistoryUseCase;
  create: CreateQuoteUseCase;
  update: UpdateQuoteUseCase;
  send: SendQuoteUseCase;
  changeStatus: ChangeQuoteStatusUseCase;
  void: VoidQuoteUseCase;
  changeExpiry: ChangeExpiryUseCase;
  reassign: ReassignQuoteUseCase;
  reactivationPreview: GetReactivationPreviewUseCase;
  reactivate: ReactivateQuoteUseCase;
  duplicate: DuplicateQuoteUseCase;
  requireAuth: RequireAuth;
}

const idSchema = z.uuid();

/** Un id mal formado equivale a una cotización inexistente. */
function quoteId(req: Request): string {
  const parsed = idSchema.safeParse(req.params['id']);
  if (!parsed.success) throw new AppError('QUOTE_NOT_FOUND', 404);
  return parsed.data;
}

function actorOf(req: Request): Actor {
  if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
  return req.actor;
}

export function createQuotesRouter(deps: QuotesRouterDependencies): Router {
  const router = Router();
  router.use(deps.requireAuth());
  const managers = deps.requireAuth({ roles: ['MANAGER', 'ADMIN'] });

  router.get('/', async (req, res) => {
    res.json(await deps.list.execute(actorOf(req), listQuotesQuerySchema.parse(req.query)));
  });

  router.post('/', async (req, res) => {
    const input = createQuoteRequestSchema.parse(req.body);
    res.status(201).json(await deps.create.execute(actorOf(req), input));
  });

  router.get('/:id', async (req, res) => {
    res.json(await deps.get.execute(actorOf(req), quoteId(req)));
  });

  router.patch('/:id', async (req, res) => {
    const id = quoteId(req);
    res.json(await deps.update.execute(actorOf(req), id, updateQuoteRequestSchema.parse(req.body)));
  });

  router.get('/:id/history', async (req, res) => {
    res.json(await deps.history.execute(actorOf(req), quoteId(req)));
  });

  router.post('/:id/send', async (req, res) => {
    const id = quoteId(req);
    res.json(await deps.send.execute(actorOf(req), id, quoteMutationSchema.parse(req.body)));
  });

  router.post('/:id/status', async (req, res) => {
    const id = quoteId(req);
    const input = changeQuoteStatusRequestSchema.parse(req.body);
    res.json(await deps.changeStatus.execute(actorOf(req), id, input));
  });

  router.post('/:id/void', async (req, res) => {
    const id = quoteId(req);
    res.json(await deps.void.execute(actorOf(req), id, voidQuoteRequestSchema.parse(req.body)));
  });

  router.patch('/:id/expiry', async (req, res) => {
    const id = quoteId(req);
    const input = changeExpiryRequestSchema.parse(req.body);
    res.json(await deps.changeExpiry.execute(actorOf(req), id, input));
  });

  router.post('/:id/reassign', managers, async (req, res) => {
    const id = quoteId(req);
    const input = reassignQuoteRequestSchema.parse(req.body);
    res.json(await deps.reassign.execute(actorOf(req), id, input));
  });

  router.get('/:id/reactivation-preview', async (req, res) => {
    res.json(await deps.reactivationPreview.execute(actorOf(req), quoteId(req)));
  });

  router.post('/:id/reactivate', async (req, res) => {
    const id = quoteId(req);
    const input = reactivateQuoteRequestSchema.parse(req.body);
    res.json(await deps.reactivate.execute(actorOf(req), id, input));
  });

  router.post('/:id/duplicate', async (req, res) => {
    res.status(201).json(await deps.duplicate.execute(actorOf(req), quoteId(req)));
  });

  return router;
}
