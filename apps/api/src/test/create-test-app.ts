import { createApp } from '../app.js';
import { loadEnv } from '../core/env/index.js';
import { createLogger } from '../core/logger/index.js';

export function createTestApp(overrides: Record<string, string> = {}) {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://zentia:zentia@localhost:5432/zentia_test',
    LOG_LEVEL: 'silent',
    ...overrides,
  });
  return createApp({ env, logger: createLogger(env.LOG_LEVEL) });
}
