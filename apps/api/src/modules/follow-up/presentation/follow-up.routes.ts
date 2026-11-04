import {
  createInteractionRequestSchema,
  listInteractionsQuerySchema,
  listNotificationsQuerySchema,
} from '@zentia/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { Actor } from '../../auth/index.js';
import type {
  CountUnreadUseCase,
  ListInteractionsUseCase,
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  RegisterInteractionUseCase,
} from '../application/index.js';

function actorOf(req: Request): Actor {
  if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
  return req.actor;
}

export function createInteractionsRouter(deps: {
  register: RegisterInteractionUseCase;
  list: ListInteractionsUseCase;
  requireAuth: RequireAuth;
}): Router {
  const router = Router();
  router.use(deps.requireAuth());
  router.post('/', async (req, res) => {
    const input = createInteractionRequestSchema.parse(req.body);
    res.status(201).json(await deps.register.execute(actorOf(req), input));
  });
  router.get('/', async (req, res) => {
    res.json(await deps.list.execute(actorOf(req), listInteractionsQuerySchema.parse(req.query)));
  });
  return router;
}

export function createNotificationsRouter(deps: {
  list: ListNotificationsUseCase;
  countUnread: CountUnreadUseCase;
  markRead: MarkNotificationReadUseCase;
  markAllRead: MarkAllNotificationsReadUseCase;
  requireAuth: RequireAuth;
}): Router {
  const router = Router();
  router.use(deps.requireAuth());
  router.get('/', async (req, res) => {
    res.json(await deps.list.execute(actorOf(req), listNotificationsQuerySchema.parse(req.query)));
  });
  router.get('/unread-count', async (req, res) => {
    res.json(await deps.countUnread.execute(actorOf(req)));
  });
  router.post('/read-all', async (req, res) => {
    await deps.markAllRead.execute(actorOf(req));
    res.status(204).end();
  });
  router.post('/:id/read', async (req, res) => {
    const id = z.uuid().safeParse(req.params['id']);
    if (!id.success) throw new AppError('NOTIFICATION_NOT_FOUND', 404);
    await deps.markRead.execute(actorOf(req), id.data);
    res.status(204).end();
  });
  return router;
}
