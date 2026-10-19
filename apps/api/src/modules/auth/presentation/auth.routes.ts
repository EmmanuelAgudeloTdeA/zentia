import { changePasswordRequestSchema, loginRequestSchema, type AuthSession } from '@zentia/shared';
import { Router, type RequestHandler, type Response } from 'express';
import { AppError } from '../../../core/http/index.js';
import type { RequireAuth } from '../../../core/modules/index.js';
import type {
  ChangeOwnPasswordUseCase,
  IssuedSession,
  LoginUseCase,
  LogoutUseCase,
  RefreshSessionUseCase,
} from '../application/index.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './refresh-cookie.js';

export interface AuthRouterDependencies {
  login: LoginUseCase;
  refresh: RefreshSessionUseCase;
  logout: LogoutUseCase;
  changePassword: ChangeOwnPasswordUseCase;
  loginLimiter: RequestHandler;
  publicLimiter: RequestHandler;
  requireAuth: RequireAuth;
}

const CLEARS_COOKIE = new Set(['INVALID_REFRESH_TOKEN', 'REFRESH_TOKEN_REUSED']);

function sendSession(res: Response, session: IssuedSession): void {
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
  const body: AuthSession = { accessToken: session.accessToken, user: session.user };
  res.status(200).json(body);
}

export function createAuthRouter(deps: AuthRouterDependencies): Router {
  const router = Router();

  router.post('/login', deps.loginLimiter, async (req, res) => {
    const session = await deps.login.execute(loginRequestSchema.parse(req.body));
    sendSession(res, session);
  });

  router.post('/refresh', deps.publicLimiter, async (req, res) => {
    try {
      sendSession(res, await deps.refresh.execute(readRefreshCookie(req)));
    } catch (error) {
      if (error instanceof AppError && CLEARS_COOKIE.has(error.code)) clearRefreshCookie(res);
      throw error;
    }
  });

  router.post('/logout', deps.publicLimiter, async (req, res) => {
    try {
      await deps.logout.execute(readRefreshCookie(req));
    } catch (error) {
      req.log.warn({ err: error }, 'Logout failed; responding 204 anyway');
    }
    clearRefreshCookie(res);
    res.status(204).end();
  });

  router.post(
    '/change-password',
    deps.requireAuth({ allowPasswordChangeRequired: true }),
    async (req, res) => {
      if (!req.actor) throw new AppError('UNAUTHENTICATED', 401);
      const input = changePasswordRequestSchema.parse(req.body);
      sendSession(res, await deps.changePassword.execute(req.actor.id, input));
    },
  );

  return router;
}
