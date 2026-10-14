import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';

export interface ModuleDependencies {
  publicLimiter: RequestHandler;
}

export interface ModuleDefinition {
  name: string;
  basePath: string;
  router: Router;
  openapi: OpenAPIRegistry;
}
