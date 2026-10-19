import { createApp } from '../app.js';
import type { Clock } from '../core/clock/index.js';
import { loadEnv } from '../core/env/index.js';
import { createLogger } from '../core/logger/index.js';
import { createInMemoryAuth, TEST_JWT_SECRET, type InMemoryAuth } from './in-memory-auth.js';

interface TestAppOptions {
  env?: Record<string, string>;
  auth?: InMemoryAuth;
  clock?: Clock;
}

export function createTestApp({ env: overrides = {}, auth, clock }: TestAppOptions = {}) {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://zentia:zentia@localhost:5432/zentia_test',
    LOG_LEVEL: 'silent',
    JWT_ACCESS_SECRET: TEST_JWT_SECRET,
    BCRYPT_COST: '4',
    ...overrides,
  });
  return createApp({
    env,
    logger: createLogger(env.LOG_LEVEL),
    overrides: { auth: auth ?? createInMemoryAuth() },
    ...(clock ? { clock } : {}),
  });
}
