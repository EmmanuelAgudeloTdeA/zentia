import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import {
  ChangeOrderStatusUseCase,
  ConvertQuoteToOrderUseCase,
  GetOrderUseCase,
  GetQuoteOrderUseCase,
  ListOrdersUseCase,
  type OrdersDependencies,
} from './application/index.js';
import {
  createOrdersOpenApi,
  createOrdersRouter,
  createQuoteOrderRouter,
} from './presentation/index.js';

export { createOrderActionsContributor, type OrdersInfrastructure } from './application/index.js';
export { createPrismaOrdersInfrastructure } from './infrastructure/index.js';

export type OrdersModuleOptions = ModuleDependencies & OrdersDependencies;

/** `/orders` y la conversión bajo `/quotes/:id/order`. */
export function createOrdersModules({
  requireAuth,
  publicLimiter: _publicLimiter,
  ...deps
}: OrdersModuleOptions): ModuleDefinition[] {
  return [
    {
      name: 'orders',
      basePath: '/orders',
      router: createOrdersRouter({
        list: new ListOrdersUseCase(deps),
        get: new GetOrderUseCase(deps),
        changeStatus: new ChangeOrderStatusUseCase(deps),
        requireAuth,
      }),
      openapi: createOrdersOpenApi(),
    },
    {
      name: 'quote-orders',
      basePath: '/quotes',
      router: createQuoteOrderRouter({
        convert: new ConvertQuoteToOrderUseCase(deps),
        getByQuote: new GetQuoteOrderUseCase(deps),
        requireAuth,
      }),
      openapi: new OpenAPIRegistry(),
    },
  ];
}
