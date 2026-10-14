import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from './app-error.js';

export function createGeneralLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED', 429)),
  });
}
