import type { RequestHandler } from 'express';
import type { Clock } from '../../core/clock/index.js';
import type { ModuleDefinition, RequireAuth } from '../../core/modules/index.js';
import {
  AuthenticateRequestUseCase,
  ChangeOwnPasswordUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshSessionUseCase,
  type AuthInfrastructure,
} from './application/index.js';
import {
  createAuthOpenApi,
  createAuthRouter,
  createLoginLimiter,
  createRequireAuth,
} from './presentation/index.js';

export {
  assertCanAccess,
  SeedFirstAdminUseCase,
  type AuthInfrastructure,
} from './application/index.js';
export { resolveScope, scopeFilter, type AccessScope, type Actor } from './domain/index.js';
export { createPrismaAuthInfrastructure, type AuthSecurityConfig } from './infrastructure/index.js';

export interface AuthModuleOptions {
  infrastructure: AuthInfrastructure;
  clock: Clock;
  refreshTokenTtlSeconds: number;
  publicLimiter: RequestHandler;
}

export interface AuthModule {
  module: ModuleDefinition;
  requireAuth: RequireAuth;
}

export function createAuthModule(options: AuthModuleOptions): AuthModule {
  const deps = {
    ...options.infrastructure,
    clock: options.clock,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds,
  };
  const requireAuth = createRequireAuth(new AuthenticateRequestUseCase(deps));
  return {
    requireAuth,
    module: {
      name: 'auth',
      basePath: '/auth',
      router: createAuthRouter({
        login: new LoginUseCase(deps),
        refresh: new RefreshSessionUseCase(deps),
        logout: new LogoutUseCase(deps),
        changePassword: new ChangeOwnPasswordUseCase(deps),
        loginLimiter: createLoginLimiter(),
        publicLimiter: options.publicLimiter,
        requireAuth,
      }),
      openapi: createAuthOpenApi(),
    },
  };
}
