import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from './app-error.js';

function createLimiter(limit: number): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED', 429)),
  });
}

/** `POST /auth/refresh`: contador propio para que tras un NAT los recursos públicos no cierren sesiones. */
export function createSessionLimiter(): RequestHandler {
  return createLimiter(60);
}

/** Recursos públicos: `/company/branding`, `/company/logo` y `/health`. */
export function createResourceLimiter(): RequestHandler {
  return createLimiter(120);
}
