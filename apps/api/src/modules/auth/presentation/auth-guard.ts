import type { RequestHandler } from 'express';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { AuthenticateRequestUseCase } from '../application/index.js';

function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  return match?.[1];
}

export function createRequireAuth(authenticate: AuthenticateRequestUseCase): RequireAuth {
  return ({ roles, allowPasswordChangeRequired = false } = {}): RequestHandler =>
    async (req, _res, next) => {
      try {
        const token = bearerToken(req.headers.authorization);
        if (!token) throw new AppError('UNAUTHENTICATED', 401);
        const actor = await authenticate.execute(token);
        if (actor.mustChangePassword && !allowPasswordChangeRequired) {
          throw new AppError('PASSWORD_CHANGE_REQUIRED', 403);
        }
        if (roles && !roles.includes(actor.role)) throw new AppError('FORBIDDEN', 403);
        req.actor = actor;
        next();
      } catch (error) {
        next(error);
      }
    };
}
