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
import {
  createCatalogModule,
  createPrismaCatalogInfrastructure,
  type CatalogInfrastructure,
} from './catalog/index.js';
import {
  createCompanySettingsModule,
  createPrismaCompanySettingsInfrastructure,
  type CompanySettingsInfrastructure,
} from './company-settings/index.js';
import {
  createCustomersModule,
  createPrismaCustomersInfrastructure,
  type CustomersInfrastructure,
} from './customers/index.js';
import { createHealthModule } from './health/index.js';
import {
  createUsersModule,
  CryptoTemporaryPasswords,
  type UsersInfrastructure,
} from './users/index.js';

/** Adaptadores que las pruebas pueden reemplazar; por defecto se usan los de Prisma. */
export interface InfrastructureOverrides {
  auth?: AuthInfrastructure;
  companySettings?: CompanySettingsInfrastructure;
  users?: UsersInfrastructure;
  customers?: CustomersInfrastructure;
  catalog?: CatalogInfrastructure;
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
  const authInfrastructure =
    overrides.auth ??
    createPrismaAuthInfrastructure(getPrisma(), {
      jwtAccessSecret: env.JWT_ACCESS_SECRET,
      accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL,
      bcryptCost: env.BCRYPT_COST,
    });
  const auth = createAuthModule({
    infrastructure: authInfrastructure,
    clock,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL,
    publicLimiter,
  });
  const dependencies: ModuleDependencies = { publicLimiter, requireAuth: auth.requireAuth };
  const companySettings = createCompanySettingsModule({
    ...dependencies,
    infrastructure:
      overrides.companySettings ?? createPrismaCompanySettingsInfrastructure(getPrisma()),
  });
  const users = createUsersModule({
    ...dependencies,
    auth: authInfrastructure,
    infrastructure: overrides.users ?? { temporaryPasswords: new CryptoTemporaryPasswords() },
    clock,
  });
  const customers = createCustomersModule({
    ...dependencies,
    infrastructure: overrides.customers ?? createPrismaCustomersInfrastructure(getPrisma()),
  });
  const catalog = createCatalogModule({
    ...dependencies,
    infrastructure: overrides.catalog ?? createPrismaCatalogInfrastructure(getPrisma()),
  });
  return [
    createHealthModule(dependencies),
    auth.module,
    users,
    companySettings.module,
    customers.module,
    catalog.module,
  ];
}
