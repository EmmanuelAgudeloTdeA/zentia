import type { RequestHandler } from 'express';
import type { Clock } from '../core/clock/index.js';
import type { Env } from '../core/env/index.js';
import type { ModuleDefinition, ModuleDependencies } from '../core/modules/index.js';
import { getPrisma } from '../core/prisma/index.js';
import {
  createAuthModule,
  createPrismaAuthInfrastructure,
  type AuthInfrastructure,
} from './auth/index.js';
import {
  createCatalogModule,
  createPrismaCatalogInfrastructure,
  type CatalogInfrastructure,
} from './catalog/index.js';
import {
  createCompanySettingsModule,
  createPrismaCompanySettingsInfrastructure,
  type CompanySettingsInfrastructure,
} from './company-settings/index.js';
import {
  createCustomersModule,
  createPrismaCustomersInfrastructure,
  type CustomersInfrastructure,
} from './customers/index.js';
import {
  createDocumentsInfrastructure,
  createDocumentsModule,
  documentActions,
  type DocumentsInfrastructure,
} from './documents/index.js';
import {
  createFollowUpModules,
  createPrismaFollowUpInfrastructure,
  createTransferNotificationsListener,
  type FollowUpInfrastructure,
} from './follow-up/index.js';
import { createHealthModule } from './health/index.js';
import {
  createOrderActionsContributor,
  createOrdersModules,
  createPrismaOrdersInfrastructure,
  type OrdersInfrastructure,
} from './orders/index.js';
import {
  createPrismaQuotesInfrastructure,
  createQuotesModule,
  type QuotesInfrastructure,
} from './quotes/index.js';
import {
  createUsersModule,
  CryptoTemporaryPasswords,
  type UsersInfrastructure,
} from './users/index.js';

/** Adaptadores que las pruebas pueden reemplazar; por defecto se usan los de Prisma. */
export interface InfrastructureOverrides {
  auth?: AuthInfrastructure;
  companySettings?: CompanySettingsInfrastructure;
  users?: UsersInfrastructure;
  customers?: CustomersInfrastructure;
  catalog?: CatalogInfrastructure;
  quotes?: QuotesInfrastructure;
  documents?: DocumentsInfrastructure;
  followUp?: FollowUpInfrastructure;
  orders?: OrdersInfrastructure;
}

export interface CreateModulesOptions {
  env: Env;
  clock: Clock;
  publicLimiter: RequestHandler;
  overrides?: InfrastructureOverrides;
}

export function createModules({
  env,
  clock,
  publicLimiter,
  overrides = {},
}: CreateModulesOptions): ModuleDefinition[] {
  const authInfrastructure =
    overrides.auth ??
    createPrismaAuthInfrastructure(getPrisma(), {
      jwtAccessSecret: env.JWT_ACCESS_SECRET,
      accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL,
      bcryptCost: env.BCRYPT_COST,
    });
  const auth = createAuthModule({
    infrastructure: authInfrastructure,
    clock,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL,
    publicLimiter,
  });
  const dependencies: ModuleDependencies = { publicLimiter, requireAuth: auth.requireAuth };
  const companySettings = createCompanySettingsModule({
    ...dependencies,
    infrastructure:
      overrides.companySettings ?? createPrismaCompanySettingsInfrastructure(getPrisma()),
  });
  const users = createUsersModule({
    ...dependencies,
    auth: authInfrastructure,
    infrastructure: overrides.users ?? { temporaryPasswords: new CryptoTemporaryPasswords() },
    clock,
  });
  const customers = createCustomersModule({
    ...dependencies,
    infrastructure: overrides.customers ?? createPrismaCustomersInfrastructure(getPrisma()),
  });
  const catalog = createCatalogModule({
    ...dependencies,
    infrastructure: overrides.catalog ?? createPrismaCatalogInfrastructure(getPrisma()),
  });
  const followUpInfrastructure =
    overrides.followUp ?? createPrismaFollowUpInfrastructure(getPrisma());
  const ordersInfrastructure = overrides.orders ?? createPrismaOrdersInfrastructure(getPrisma());
  const quotes = createQuotesModule({
    ...dependencies,
    infrastructure:
      overrides.quotes ?? createPrismaQuotesInfrastructure(getPrisma(), authInfrastructure.users),
    clock,
    settings: companySettings.settingsReader,
    customers: customers.customerReader,
    catalog: catalog.catalogReader,
    actionContributors: [documentActions, createOrderActionsContributor(ordersInfrastructure)],
    reassignedListeners: [createTransferNotificationsListener(followUpInfrastructure)],
  });
  const documents = createDocumentsModule({
    ...dependencies,
    ...(overrides.documents ?? createDocumentsInfrastructure()),
    quotes: quotes.quoteReader,
    sendQuote: quotes.sendQuote,
    settings: companySettings.settingsReader,
    customers: customers.customerReader,
    clock,
  });
  const followUp = createFollowUpModules({
    ...dependencies,
    ...followUpInfrastructure,
    clock,
    settings: companySettings.settingsReader,
    customers: customers.customerReader,
    quotes: quotes.quoteReader,
    expireQuotes: quotes.expireQuotes,
  });
  return [
    createHealthModule(dependencies),
    auth.module,
    users,
    companySettings.module,
    customers.module,
    catalog.module,
    quotes.module,
    documents,
    ...followUp,
    ...createOrdersModules({
      ...dependencies,
      ...ordersInfrastructure,
      quotes: quotes.quoteReader,
      clock,
    }),
  ];
}
