import type { Clock } from '../../core/clock/index.js';
import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import type { AuthInfrastructure } from '../auth/index.js';
import {
  CreateUserUseCase,
  GetUserUseCase,
  ListUserOptionsUseCase,
  ListUsersUseCase,
  ResetPasswordUseCase,
  UpdateUserUseCase,
  type UsersInfrastructure,
} from './application/index.js';
import { createUsersOpenApi, createUsersRouter } from './presentation/index.js';

export type { UsersInfrastructure } from './application/index.js';
export { CryptoTemporaryPasswords } from './infrastructure/index.js';

export interface UsersModuleOptions extends ModuleDependencies {
  auth: AuthInfrastructure;
  infrastructure: UsersInfrastructure;
  clock: Clock;
}

export function createUsersModule({
  auth,
  infrastructure,
  clock,
  requireAuth,
}: UsersModuleOptions): ModuleDefinition {
  const deps = {
    users: auth.users,
    unitOfWork: auth.unitOfWork,
    hasher: auth.hasher,
    temporaryPasswords: infrastructure.temporaryPasswords,
    clock,
  };
  return {
    name: 'users',
    basePath: '/users',
    router: createUsersRouter({
      listUsers: new ListUsersUseCase(deps),
      listOptions: new ListUserOptionsUseCase(deps),
      getUser: new GetUserUseCase(deps),
      createUser: new CreateUserUseCase(deps),
      updateUser: new UpdateUserUseCase(deps),
      resetPassword: new ResetPasswordUseCase(deps),
      requireAuth,
    }),
    openapi: createUsersOpenApi(),
  };
}
