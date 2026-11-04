import { createApp } from '../app.js';
import type { Clock } from '../core/clock/index.js';
import { loadEnv } from '../core/env/index.js';
import { createLogger } from '../core/logger/index.js';
import type { UsersInfrastructure } from '../modules/users/index.js';
import { createInMemoryCatalog, type InMemoryCatalog } from './in-memory-catalog.js';
import { createInMemoryCustomers, type InMemoryCustomers } from './in-memory-customers.js';
import { createInMemoryFollowUp, type InMemoryFollowUp } from './in-memory-follow-up.js';
import { createFakeDashboard } from './in-memory-dashboard.js';
import { createInMemoryOrders } from './in-memory-orders.js';
import { createInMemoryQuotes, type InMemoryQuotes } from './in-memory-quotes.js';
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
  quotes?: InMemoryQuotes;
  followUp?: InMemoryFollowUp;
  dashboard?: ReturnType<typeof createFakeDashboard>;
  clock?: Clock;
}

export function quoteLookups(auth: InMemoryAuth, customers: InMemoryCustomers) {
  return {
    customer: (id: string) => {
      const customer = customers.customers.customers.get(id);
      return {
        id,
        name: customer?.name ?? '?',
        documentId: customer?.documentId ?? '',
        isActive: customer?.isActive ?? false,
      };
    },
    user: (id: string) => {
      const user = auth.users.users.get(id);
      return user ? { id, name: user.name, isActive: user.isActive } : null;
    },
  };
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
  quotes,
  followUp,
  dashboard,
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
  const customersInfrastructure = customers ?? createInMemoryCustomers(userName);
  const quotesInfrastructure =
    quotes ?? createInMemoryQuotes(quoteLookups(authInfrastructure, customersInfrastructure));
  return createApp({
    env,
    logger: createLogger(env.LOG_LEVEL),
    overrides: {
      auth: authInfrastructure,
      companySettings: companySettings ?? createInMemoryCompanySettings(),
      users: users ?? sequentialTemporaryPasswords(),
      customers: customersInfrastructure,
      catalog: catalog ?? createInMemoryCatalog(),
      quotes: quotesInfrastructure,
      orders: createInMemoryOrders((id) => quotesInfrastructure.quotes.findById(id), userName)
        .infrastructure,
      followUp: (followUp ?? createInMemoryFollowUp()).infrastructure,
      dashboard: (dashboard ?? createFakeDashboard()).infrastructure,
    },
    ...(clock ? { clock } : {}),
  });
}
