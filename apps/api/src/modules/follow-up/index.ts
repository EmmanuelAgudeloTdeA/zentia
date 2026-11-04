import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import {
  CountUnreadUseCase,
  createFollowUpJobs,
  ListInteractionsUseCase,
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  RegisterInteractionUseCase,
  RunFollowUpAlertsUseCase,
  type FollowUpDependencies,
} from './application/index.js';
import {
  createFollowUpOpenApi,
  createInteractionsRouter,
  createNotificationsRouter,
} from './presentation/index.js';

export type {
  FollowUpInfrastructure,
  NotificationProbabilityProvider,
} from './application/index.js';
export { createTransferNotificationsListener } from './application/index.js';
export { createPrismaFollowUpInfrastructure } from './infrastructure/index.js';

export type FollowUpModuleOptions = ModuleDependencies &
  FollowUpDependencies & { expireQuotes: { execute: () => Promise<number> } };

/** Dos recursos (`/interactions` y `/notifications`) y los jobs diarios. */
export function createFollowUpModules({
  requireAuth,
  resourceLimiter: _resourceLimiter,
  expireQuotes,
  ...deps
}: FollowUpModuleOptions): ModuleDefinition[] {
  return [
    {
      name: 'interactions',
      basePath: '/interactions',
      router: createInteractionsRouter({
        register: new RegisterInteractionUseCase(deps),
        list: new ListInteractionsUseCase(deps),
        requireAuth,
      }),
      openapi: createFollowUpOpenApi(),
      jobs: createFollowUpJobs(deps, expireQuotes, new RunFollowUpAlertsUseCase(deps)),
    },
    {
      name: 'notifications',
      basePath: '/notifications',
      router: createNotificationsRouter({
        list: new ListNotificationsUseCase(deps),
        countUnread: new CountUnreadUseCase(deps),
        markRead: new MarkNotificationReadUseCase(deps),
        markAllRead: new MarkAllNotificationsReadUseCase(deps),
        requireAuth,
      }),
      openapi: new OpenAPIRegistry(),
    },
  ];
}
