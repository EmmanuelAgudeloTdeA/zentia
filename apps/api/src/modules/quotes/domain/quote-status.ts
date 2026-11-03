import type { QuoteStatus } from '@zentia/shared';

/** RN-19. `EXPIRED` solo la asigna el sistema; `EXPIRED → SENT` es la reactivación. */
const TRANSITIONS: Readonly<Record<QuoteStatus, readonly QuoteStatus[]>> = {
  DRAFT: ['SENT', 'VOIDED'],
  SENT: ['APPROVED', 'REJECTED', 'EXPIRED', 'VOIDED'],
  EXPIRED: ['SENT'],
  APPROVED: [],
  REJECTED: [],
  VOIDED: [],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
