import type { Actor } from '../../../auth/index.js';
import type { Person, Quote } from '../../domain/index.js';
import type { QuotesTransaction } from './quote-repository.js';

export interface QuoteReassignedEvent {
  quoteId: string;
  from: Person;
  to: Person;
}

/** M6 traspasa las notificaciones no leídas en la misma transacción de la reasignación. */
export type QuoteReassignedListener = (
  event: QuoteReassignedEvent,
  tx: QuotesTransaction,
) => Promise<void>;

/** Otros módulos (M5) suman acciones a `allowedActions`. */
export type AllowedActionsContributor = (quote: Quote, actor: Actor) => string[];
