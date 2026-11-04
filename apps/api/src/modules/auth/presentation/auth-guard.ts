import type { RequestHandler } from 'express';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type { AuthenticateRequestUseCase } from '../application/index.js';

function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  return match?.[1];
}

export function createRequireAuth(authenticate: AuthenticateRequestUseCase): RequireAuth {
  const authenticateBearer = (header: string | undefined) => {
    const token = bearerToken(header);
    if (!token) throw new AppError('UNAUTHENTICATED', 401);
    return authenticate.execute(token);
  };
  // Routers anidados (p. ej. bajo /quotes) reutilizan el actor ya cargado: una sola consulta por petición.
  return ({ roles, allowPasswordChangeRequired = false } = {}): RequestHandler =>
    async (req, _res, next) => {
      try {
        const actor = req.actor ?? (await authenticateBearer(req.headers.authorization));
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
