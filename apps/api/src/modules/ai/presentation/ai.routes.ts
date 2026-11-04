import { probabilitiesQuerySchema } from '@zentia/shared';
import { Router, type Request, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { Actor } from '../../auth/index.js';
import type {
  GetCalibrationStatusUseCase,
  GetProbabilitiesUseCase,
  SuggestFollowUpMessageUseCase,
} from '../application/index.js';

function actorOf(req: Request): Actor {
  if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
  return req.actor;
}

/** 10 solicitudes por usuario por minuto (cuida el límite gratuito del proveedor). */
export function createFollowUpMessageLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => req.actor?.id ?? 'anonymous',
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED', 429)),
  });
}

/** Se monta bajo `/quotes`: `POST /quotes/:id/follow-up-message`. */
export function createAiQuoteRouter(deps: {
  suggest: SuggestFollowUpMessageUseCase;
  requireAuth: RequireAuth;
}): Router {
  const router = Router();
  const limiter = createFollowUpMessageLimiter();
  router.post('/:id/follow-up-message', deps.requireAuth(), limiter, async (req, res) => {
    const id = z.uuid().safeParse(req.params['id']);
    if (!id.success) throw new AppError('QUOTE_NOT_FOUND', 404);
    res.json(await deps.suggest.execute(actorOf(req), id.data));
  });
  return router;
}

export function createAiRouter(deps: {
  probabilities: GetProbabilitiesUseCase;
  calibration: GetCalibrationStatusUseCase;
  requireAuth: RequireAuth;
}): Router {
  const router = Router();
  router.get('/probabilities', deps.requireAuth(), async (req, res) => {
    const { quoteIds } = probabilitiesQuerySchema.parse(req.query);
    res.json(await deps.probabilities.execute(actorOf(req), quoteIds));
  });
  router.get(
    '/calibration-status',
    deps.requireAuth({ roles: ['MANAGER', 'ADMIN'] }),
    async (_req, res) => {
      res.json(await deps.calibration.execute());
    },
  );
  return router;
}
