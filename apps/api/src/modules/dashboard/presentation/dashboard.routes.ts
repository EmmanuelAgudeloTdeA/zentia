import { dashboardQuerySchema } from '@zentia/shared';
import { Router } from 'express';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { GetDashboardSummaryUseCase } from '../application/index.js';

export function createDashboardRouter(deps: {
  summary: GetDashboardSummaryUseCase;
  requireAuth: RequireAuth;
}): Router {
  const router = Router();
  router.get('/summary', deps.requireAuth(), async (req, res) => {
    if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
    res.json(await deps.summary.execute(req.actor, dashboardQuerySchema.parse(req.query)));
  });
  return router;
}
