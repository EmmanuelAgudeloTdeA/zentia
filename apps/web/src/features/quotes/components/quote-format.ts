import type { QuoteStatus } from '@zentia/shared';
import type { TFunction } from 'i18next';
import { errorKey, isApiError } from '../../../core/errors';
import { daysBetween, formatDay } from '../../../core/format';

/** Texto de vencimiento: "Vence hoy", "Vence en N días" (≤ X), "Vence el …" o "Venció el …". */
export function expiryLabel(
  t: TFunction,
  status: QuoteStatus,
  expiresAt: string | null,
  today: string,
  alertDays: number,
): { text: string; urgent: boolean } | null {
  if (!expiresAt) return null;
  const date = formatDay(expiresAt);
  if (status !== 'SENT') return { text: t('quotes.expiry.on', { date }), urgent: false };
  const days = daysBetween(today, expiresAt);
  if (days < 0) return { text: t('quotes.expiry.expiredOn', { date }), urgent: true };
  if (days === 0) return { text: t('quotes.expiry.today'), urgent: true };
  if (days <= alertDays) return { text: t('quotes.expiry.inDays', { count: days }), urgent: true };
  return { text: t('quotes.expiry.on', { date }), urgent: false };
}

/** Error de la API traducido con sus parámetros (p. ej. `{ limit }`). */
export function errorText(t: TFunction, error: unknown): string {
  return t(errorKey(error), isApiError(error) ? (error.params ?? {}) : {});
}
