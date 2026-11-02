import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { SystemClock, type Clock } from './core/clock/index.js';
import type { Env } from './core/env/index.js';
import { createGeneralLimiter, errorHandler, notFoundHandler } from './core/http/index.js';
import {
  buildOpenApiDocument,
  createCoreRegistry,
  createDocsRouter,
} from './core/openapi/index.js';
import { createModules, type InfrastructureOverrides } from './modules/index.js';

export interface AppOptions {
  env: Env;
  logger: Logger;
  clock?: Clock;
  overrides?: InfrastructureOverrides;
}

export function createApp({
  env,
  logger,
  clock = new SystemClock(),
  overrides,
}: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null },
      },
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );
  const modules = createModules({
    env,
    clock,
    publicLimiter: createGeneralLimiter(),
    ...(overrides ? { overrides } : {}),
  });
  for (const module of modules) {
    if (module.bodyParsers) app.use(`/api${module.basePath}`, module.bodyParsers);
  }
  app.use(express.json({ limit: '100kb' }));

  const api = Router();
  for (const module of modules) {
    api.use(module.basePath, module.router);
  }
  if (env.DOCS_ENABLED) {
    const document = buildOpenApiDocument([
      createCoreRegistry(),
      ...modules.map((module) => module.openapi),
    ]);
    api.use('/docs', createDocsRouter(document));
  }
  api.use(notFoundHandler);

  app.use('/api', api);
  app.use(errorHandler);
  return app;
}
