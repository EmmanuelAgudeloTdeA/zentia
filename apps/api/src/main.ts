import 'dotenv/config';
import { pino } from 'pino';
import { createApplication } from './app.js';
import { EnvValidationError, loadEnv, type Env } from './core/env/index.js';
import { createLogger } from './core/logger/index.js';
import { disconnectPrisma } from './core/prisma/index.js';
import { NodeCronScheduler } from './core/scheduler/index.js';

function readEnv(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      pino().fatal({ variables: error.variables }, 'Invalid environment variables');
      process.exit(1);
    }
    throw error;
  }
}

const env = readEnv();
process.env.TZ = env.TZ;

const logger = createLogger(env.LOG_LEVEL);
const { app, jobs } = createApplication({ env, logger });

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, docs: env.DOCS_ENABLED }, 'API listening');
});

const scheduler = env.SCHEDULER_ENABLED ? new NodeCronScheduler(logger) : null;
if (scheduler) {
  for (const job of jobs) scheduler.register(job);
  // Pasada de recuperación al arrancar, en orden: primero vencer y luego alertar.
  void (async () => {
    for (const job of jobs) await scheduler.runNow(job.name);
  })();
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down');
  scheduler?.stop();
  server.close();
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGTERM', (signal) => void shutdown(signal));
process.on('SIGINT', (signal) => void shutdown(signal));
