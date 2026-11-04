import type { Clock } from '../../core/clock/index.js';
import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import type { CatalogReader } from '../catalog/index.js';
import type { SettingsReader } from '../company-settings/index.js';
import type { CustomerReader } from '../customers/index.js';
import {
  ChangeExpiryUseCase,
  ChangeQuoteStatusUseCase,
  CreateQuoteUseCase,
  DuplicateQuoteUseCase,
  ExpireQuotesUseCase,
  GetQuoteHistoryUseCase,
  GetQuoteUseCase,
  GetReactivationPreviewUseCase,
  ListQuotesUseCase,
  ReactivateQuoteUseCase,
  ReassignQuoteUseCase,
  RepositoryQuoteReader,
  SendQuoteUseCase,
  UpdateQuoteUseCase,
  VoidQuoteUseCase,
  type AllowedActionsContributor,
  type QuoteReader,
  type QuoteReassignedListener,
  type QuotesInfrastructure,
} from './application/index.js';
import { createQuotesOpenApi, createQuotesRouter } from './presentation/index.js';

export type {
  AllowedActionsContributor,
  QuoteReader,
  QuoteReassignedEvent,
  QuoteReassignedListener,
  QuotesInfrastructure,
  QuotesTransaction,
  SendQuoteUseCase,
} from './application/index.js';
export type { Quote, QuoteItem } from './domain/index.js';
export {
  createAuthUserDirectory,
  createPrismaQuotesInfrastructure,
} from './infrastructure/index.js';

export interface QuotesModuleOptions extends ModuleDependencies {
  infrastructure: QuotesInfrastructure;
  clock: Clock;
  settings: SettingsReader;
  customers: CustomerReader;
  catalog: CatalogReader;
  reassignedListeners?: readonly QuoteReassignedListener[];
  actionContributors?: readonly AllowedActionsContributor[];
}

export interface QuotesModule {
  module: ModuleDefinition;
  quoteReader: QuoteReader;
  sendQuote: SendQuoteUseCase;
  expireQuotes: ExpireQuotesUseCase;
}

export function createQuotesModule({
  infrastructure,
  requireAuth,
  reassignedListeners = [],
  actionContributors = [],
  ...readers
}: QuotesModuleOptions): QuotesModule {
  const deps = { ...infrastructure, ...readers, reassignedListeners, actionContributors };
  const sendQuote = new SendQuoteUseCase(deps);
  return {
    quoteReader: new RepositoryQuoteReader(deps),
    sendQuote,
    expireQuotes: new ExpireQuotesUseCase(deps),
    module: {
      name: 'quotes',
      basePath: '/quotes',
      router: createQuotesRouter({
        list: new ListQuotesUseCase(deps),
        get: new GetQuoteUseCase(deps),
        history: new GetQuoteHistoryUseCase(deps),
        create: new CreateQuoteUseCase(deps),
        update: new UpdateQuoteUseCase(deps),
        send: sendQuote,
        changeStatus: new ChangeQuoteStatusUseCase(deps),
        void: new VoidQuoteUseCase(deps),
        changeExpiry: new ChangeExpiryUseCase(deps),
        reassign: new ReassignQuoteUseCase(deps),
        reactivationPreview: new GetReactivationPreviewUseCase(deps),
        reactivate: new ReactivateQuoteUseCase(deps),
        duplicate: new DuplicateQuoteUseCase(deps),
        requireAuth,
      }),
      openapi: createQuotesOpenApi(),
    },
  };
}
