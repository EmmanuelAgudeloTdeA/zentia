import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import type { HealthCheck } from './application/index.js';
import { createHealthOpenApi, createHealthRouter } from './presentation/index.js';

export type { HealthCheck } from './application/index.js';
export { PrismaHealthCheck } from './infrastructure/index.js';

export function createHealthModule({
  publicLimiter,
  healthCheck,
}: ModuleDependencies & { healthCheck: HealthCheck }): ModuleDefinition {
  return {
    name: 'health',
    basePath: '/health',
    router: createHealthRouter(publicLimiter, healthCheck),
    openapi: createHealthOpenApi(),
  };
}
