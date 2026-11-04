import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import {
  CreateCustomerUseCase,
  FindDocumentMatchesUseCase,
  GetCustomerUseCase,
  RepositoryCustomerReader,
  SearchCustomersUseCase,
  UpdateCustomerUseCase,
  type CustomerReader,
  type CustomersInfrastructure,
} from './application/index.js';
import { createCustomersOpenApi, createCustomersRouter } from './presentation/index.js';

export type {
  CustomerReader,
  CustomerRepository,
  CustomerSnapshotDto,
  CustomersInfrastructure,
} from './application/index.js';
export type { Customer } from './domain/index.js';
export { createPrismaCustomersInfrastructure } from './infrastructure/index.js';

export interface CustomersModuleOptions extends ModuleDependencies {
  infrastructure: CustomersInfrastructure;
}

export interface CustomersModule {
  module: ModuleDefinition;
  customerReader: CustomerReader;
}

export function createCustomersModule({
  infrastructure,
  requireAuth,
}: CustomersModuleOptions): CustomersModule {
  return {
    customerReader: new RepositoryCustomerReader(infrastructure),
    module: {
      name: 'customers',
      basePath: '/customers',
      router: createCustomersRouter({
        search: new SearchCustomersUseCase(infrastructure),
        get: new GetCustomerUseCase(infrastructure),
        documentMatches: new FindDocumentMatchesUseCase(infrastructure),
        create: new CreateCustomerUseCase(infrastructure),
        update: new UpdateCustomerUseCase(infrastructure),
        requireAuth,
      }),
      openapi: createCustomersOpenApi(),
    },
  };
}
