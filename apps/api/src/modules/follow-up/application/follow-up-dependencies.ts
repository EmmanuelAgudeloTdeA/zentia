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

export interface FollowUpDependencies extends FollowUpInfrastructure {
  clock: Clock;
  settings: SettingsReader;
  customers: CustomerReader;
  quotes: QuoteReader;
}
