import type { Clock } from '../../../core/clock/index.js';
import type { CatalogReader } from '../../catalog/index.js';
import type { SettingsReader } from '../../company-settings/index.js';
import type { CustomerReader } from '../../customers/index.js';
import type {
  AllowedActionsContributor,
  QuoteReassignedListener,
  QuoteRepository,
  QuotesUnitOfWork,
  UserDirectory,
} from './ports/index.js';

export interface QuotesInfrastructure {
  quotes: QuoteRepository;
  unitOfWork: QuotesUnitOfWork;
  users: UserDirectory;
}

export interface QuotesDependencies extends QuotesInfrastructure {
  clock: Clock;
  settings: SettingsReader;
  customers: CustomerReader;
  catalog: CatalogReader;
  reassignedListeners: readonly QuoteReassignedListener[];
  actionContributors: readonly AllowedActionsContributor[];
}
