import type { HealthResponse } from '@zentia/shared';
import { Router, type RequestHandler } from 'express';

export function createHealthRouter(publicLimiter: RequestHandler): Router {
  const router = Router();
  router.get('/', publicLimiter, (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.json(body);
  });
  return router;
}
