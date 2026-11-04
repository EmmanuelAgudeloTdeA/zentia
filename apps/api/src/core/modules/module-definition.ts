import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Role } from '@zentia/shared';
import type { RequestHandler, Router } from 'express';
import type { ScheduledJob } from '../scheduler/index.js';

export interface RequireAuthOptions {
  roles?: readonly Role[];
  /** Permite la ruta aunque el usuario deba cambiar su contraseña (solo change-password). */
  allowPasswordChangeRequired?: boolean;
}

export type RequireAuth = (options?: RequireAuthOptions) => RequestHandler;

export interface ModuleDependencies {
  resourceLimiter: RequestHandler;
  requireAuth: RequireAuth;
}

export interface ModuleDefinition {
  name: string;
  basePath: string;
  router: Router;
  openapi: OpenAPIRegistry;
  /** Parsers propios de rutas concretas; se montan antes del `express.json()` global. */
  bodyParsers?: Router;
  /** Jobs diarios del módulo; `main.ts` los registra si `SCHEDULER_ENABLED`. */
  jobs?: readonly ScheduledJob[];
}
