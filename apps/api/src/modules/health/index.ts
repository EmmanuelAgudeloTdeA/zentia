import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import { createHealthOpenApi, createHealthRouter } from './presentation/index.js';

export function createHealthModule({ publicLimiter }: ModuleDependencies): ModuleDefinition {
  return {
    name: 'health',
    basePath: '/health',
    router: createHealthRouter(publicLimiter),
    openapi: createHealthOpenApi(),
  };
}
