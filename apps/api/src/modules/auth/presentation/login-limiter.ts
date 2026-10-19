import { normalizeEmail } from '@zentia/shared';
import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../../../core/http/index.js';

const WINDOW_MS = 15 * 60_000;
const MAX_FAILED_ATTEMPTS = 5;

function emailFromBody(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'email' in body) {
    const { email } = body as { email: unknown };
    if (typeof email === 'string') return normalizeEmail(email);
  }
  return '';
}

/** Cuenta solo los intentos fallidos por IP + correo (S1.1.1). */
export function createLoginLimiter(): RequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: MAX_FAILED_ATTEMPTS,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${emailFromBody(req.body)}`,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED', 429)),
  });
}
