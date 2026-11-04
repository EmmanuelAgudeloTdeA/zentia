import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import { GetDashboardSummaryUseCase, type DashboardDependencies } from './application/index.js';
import { createDashboardOpenApi, createDashboardRouter } from './presentation/index.js';

export type {
  DashboardFilters,
  DashboardInfrastructure,
  DashboardSection,
} from './application/index.js';
export { createPrismaDashboardInfrastructure } from './infrastructure/index.js';

export function createDashboardModule({
  requireAuth,
  resourceLimiter: _resourceLimiter,
  ...deps
}: ModuleDependencies & DashboardDependencies): ModuleDefinition {
  return {
    name: 'dashboard',
    basePath: '/dashboard',
    router: createDashboardRouter({ summary: new GetDashboardSummaryUseCase(deps), requireAuth }),
    openapi: createDashboardOpenApi(),
  };
}
