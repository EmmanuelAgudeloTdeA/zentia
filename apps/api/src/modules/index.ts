import type { ModuleDefinition, ModuleDependencies } from '../core/modules/index.js';
import { createHealthModule } from './health/index.js';

export function createModules(dependencies: ModuleDependencies): ModuleDefinition[] {
  return [createHealthModule(dependencies)];
}
