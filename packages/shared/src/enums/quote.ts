export const QUOTE_STATUSES = [
  'DRAFT',
  'SENT',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'VOIDED',
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_EVENT_TYPES = [
  'DISCOUNT_OVERRIDE',
  'EXPIRY_CHANGED',
  'REASSIGNED',
  'STATE_CHANGED',
] as const;

export type QuoteEventType = (typeof QUOTE_EVENT_TYPES)[number];

/** Acciones de M4; otros módulos (M5) suman las suyas a `allowedActions`. */
export const QUOTE_ACTIONS = [
  'edit',
  'send',
  'approve',
  'reject',
  'void',
  'changeExpiry',
  'reassign',
  'reactivate',
  'duplicate',
] as const;

export type QuoteAction = (typeof QUOTE_ACTIONS)[number];

export const QUOTE_MAX_ITEMS = 100;

/** `12` → `COT-0012`; el número en BD es `Int`. */
export function formatQuoteNumber(number: number): string {
  return `COT-${String(number).padStart(4, '0')}`;
}
