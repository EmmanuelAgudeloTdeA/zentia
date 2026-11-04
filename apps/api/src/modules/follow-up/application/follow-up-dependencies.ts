import type { Clock } from '../../../core/clock/index.js';
import type { SettingsReader } from '../../company-settings/index.js';
import type { CustomerReader } from '../../customers/index.js';
import type { QuoteReader } from '../../quotes/index.js';
import type {
  FollowUpReadRepository,
  InteractionRepository,
  JobLock,
  NotificationRepository,
} from './ports/index.js';

export interface FollowUpInfrastructure {
  interactions: InteractionRepository;
  followUpRead: FollowUpReadRepository;
  notifications: NotificationRepository;
  jobLock: JobLock;
}

/** Punto de extensión de M9: probabilidad de cierre por cotización (solo las Enviadas). */
export type NotificationProbabilityProvider = (
  quoteIds: readonly string[],
) => Promise<Map<string, number>>;

export interface FollowUpDependencies extends FollowUpInfrastructure {
  probabilityProvider?: NotificationProbabilityProvider | undefined;
  clock: Clock;
  settings: SettingsReader;
  customers: CustomerReader;
  quotes: QuoteReader;
}
