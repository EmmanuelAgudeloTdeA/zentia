import { Decimal } from './decimal.js';

/** RN-36: aprobadas / (aprobadas + rechazadas + vencidas) en %, 2 decimales; `null` sin cerradas. */
export function conversionRate(approved: number, rejected: number, expired: number): string | null {
  const closed = approved + rejected + expired;
  if (closed === 0) return null;
  return new Decimal(approved)
    .times(100)
    .div(closed)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toFixed(2);
}
