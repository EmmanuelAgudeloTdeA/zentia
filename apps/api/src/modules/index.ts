import type { RequestHandler } from 'express';
import type { Clock } from '../core/clock/index.js';
import type { Env } from '../core/env/index.js';
import type { ModuleDefinition, ModuleDependencies } from '../core/modules/index.js';
import { getPrisma } from '../core/prisma/index.js';
import {
  createAuthModule,
  createPrismaAuthInfrastructure,
  type AuthInfrastructure,
} from './auth/index.js';
import { createHealthModule } from './health/index.js';

/** Adaptadores que las pruebas pueden reemplazar; por defecto se usan los de Prisma. */
export interface InfrastructureOverrides {
  auth?: AuthInfrastructure;
}

export interface CreateModulesOptions {
  env: Env;
  clock: Clock;
  publicLimiter: RequestHandler;
  overrides?: InfrastructureOverrides;
}

export function createModules({
  env,
  clock,
  publicLimiter,
  overrides = {},
}: CreateModulesOptions): ModuleDefinition[] {
  const auth = createAuthModule({
    infrastructure:
      overrides.auth ??
      createPrismaAuthInfrastructure(getPrisma(), {
        jwtAccessSecret: env.JWT_ACCESS_SECRET,
        accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL,
        bcryptCost: env.BCRYPT_COST,
      }),
    clock,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL,
    publicLimiter,
  });
  const dependencies: ModuleDependencies = { publicLimiter, requireAuth: auth.requireAuth };
  return [createHealthModule(dependencies), auth.module];
}
