import { createApp } from '../app.js';
import type { Clock } from '../core/clock/index.js';
import { loadEnv } from '../core/env/index.js';
import { createLogger } from '../core/logger/index.js';
import type { UsersInfrastructure } from '../modules/users/index.js';
import { createInMemoryCatalog, type InMemoryCatalog } from './in-memory-catalog.js';
import { createInMemoryCustomers, type InMemoryCustomers } from './in-memory-customers.js';
import { createInMemoryAuth, TEST_JWT_SECRET, type InMemoryAuth } from './in-memory-auth.js';
import {
  createInMemoryCompanySettings,
  type InMemoryCompanySettings,
} from './in-memory-company-settings.js';

interface TestAppOptions {
  env?: Record<string, string>;
  auth?: InMemoryAuth;
  companySettings?: InMemoryCompanySettings;
  users?: UsersInfrastructure;
  customers?: InMemoryCustomers;
  catalog?: InMemoryCatalog;
  clock?: Clock;
}

/** Generador determinista: cada llamada devuelve `Temporal{n}abc`. */
export function sequentialTemporaryPasswords(): UsersInfrastructure {
  let next = 0;
  return { temporaryPasswords: { generate: () => `Temporal${++next}abc` } };
}

export function createTestApp({
  env: overrides = {},
  auth,
  companySettings,
  users,
  customers,
  catalog,
  clock,
}: TestAppOptions = {}) {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://zentia:zentia@localhost:5432/zentia_test',
    LOG_LEVEL: 'silent',
    JWT_ACCESS_SECRET: TEST_JWT_SECRET,
    BCRYPT_COST: '4',
    ...overrides,
  });
  const authInfrastructure = auth ?? createInMemoryAuth();
  const userName = (id: string) => authInfrastructure.users.users.get(id)?.name ?? 'Usuario';
  return createApp({
    env,
    logger: createLogger(env.LOG_LEVEL),
    overrides: {
      auth: authInfrastructure,
      companySettings: companySettings ?? createInMemoryCompanySettings(),
      users: users ?? sequentialTemporaryPasswords(),
      customers: customers ?? createInMemoryCustomers(userName),
      catalog: catalog ?? createInMemoryCatalog(),
    },
    ...(clock ? { clock } : {}),
  });
}
