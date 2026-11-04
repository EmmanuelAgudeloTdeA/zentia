import type { HealthErrorResponse, HealthResponse } from '@zentia/shared';
import { Router, type RequestHandler } from 'express';
import type { HealthCheck } from '../application/index.js';

export function createHealthRouter(
  resourceLimiter: RequestHandler,
  healthCheck: HealthCheck,
): Router {
  const router = Router();
  router.get('/', resourceLimiter, async (_req, res) => {
    if (await healthCheck.isHealthy()) {
      const body: HealthResponse = { status: 'ok' };
      res.json(body);
      return;
    }
    const body: HealthErrorResponse = { status: 'error' };
    res.status(503).json(body);
  });
  return router;
}
