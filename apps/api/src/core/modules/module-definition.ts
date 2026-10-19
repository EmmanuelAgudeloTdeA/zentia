import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Role } from '@zentia/shared';
import type { RequestHandler, Router } from 'express';

export interface RequireAuthOptions {
  roles?: readonly Role[];
  /** Permite la ruta aunque el usuario deba cambiar su contraseña (solo change-password). */
  allowPasswordChangeRequired?: boolean;
}

export type RequireAuth = (options?: RequireAuthOptions) => RequestHandler;

export interface ModuleDependencies {
  publicLimiter: RequestHandler;
  requireAuth: RequireAuth;
}

export interface ModuleDefinition {
  name: string;
  basePath: string;
  router: Router;
  openapi: OpenAPIRegistry;
}
