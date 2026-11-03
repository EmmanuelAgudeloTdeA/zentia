import {
  createUserRequestSchema,
  listUsersQuerySchema,
  updateUserRequestSchema,
  userOptionsQuerySchema,
} from '@zentia/shared';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { Actor } from '../../auth/index.js';
import type {
  CreateUserUseCase,
  GetUserUseCase,
  ListUserOptionsUseCase,
  ListUsersUseCase,
  ResetPasswordUseCase,
  UpdateUserUseCase,
} from '../application/index.js';

export interface UsersRouterDependencies {
  listUsers: ListUsersUseCase;
  listOptions: ListUserOptionsUseCase;
  getUser: GetUserUseCase;
  createUser: CreateUserUseCase;
  updateUser: UpdateUserUseCase;
  resetPassword: ResetPasswordUseCase;
  requireAuth: RequireAuth;
}

const userIdSchema = z.uuid();

/** Un id mal formado equivale a un usuario inexistente. */
function userId(req: Request): string {
  const parsed = userIdSchema.safeParse(req.params['id']);
  if (!parsed.success) throw new AppError('USER_NOT_FOUND', 404);
  return parsed.data;
}

function actorOf(req: Request): Actor {
  if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
  return req.actor;
}

export function createUsersRouter(deps: UsersRouterDependencies): Router {
  const router = Router();
  const adminOnly = deps.requireAuth({ roles: ['ADMIN'] });

  router.get('/', adminOnly, async (req, res) => {
    res.json(await deps.listUsers.execute(listUsersQuerySchema.parse(req.query)));
  });

  router.get('/options', deps.requireAuth({ roles: ['MANAGER', 'ADMIN'] }), async (req, res) => {
    const { includeInactive } = userOptionsQuerySchema.parse(req.query);
    res.json(await deps.listOptions.execute(includeInactive));
  });

  router.get('/:id', adminOnly, async (req, res) => {
    res.json(await deps.getUser.execute(userId(req)));
  });

  router.post('/', adminOnly, async (req, res) => {
    res.status(201).json(await deps.createUser.execute(createUserRequestSchema.parse(req.body)));
  });

  router.patch('/:id', adminOnly, async (req, res) => {
    const id = userId(req);
    const changes = updateUserRequestSchema.parse(req.body);
    res.json(await deps.updateUser.execute(actorOf(req), id, changes));
  });

  router.post('/:id/reset-password', adminOnly, async (req, res) => {
    res.json(await deps.resetPassword.execute(userId(req)));
  });

  return router;
}
