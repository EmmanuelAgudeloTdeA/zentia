import {
  daysBetweenDays,
  followUpReferenceDate,
  formatQuoteNumber,
  isExpiringSoon,
  isWithoutFollowUp,
  type NotificationType,
} from '@zentia/shared';
import type { AlertCandidate } from './follow-up.js';

export interface NewNotification {
  userId: string;
  quoteId: string;
  type: NotificationType;
  referenceDate: string;
  params: Record<string, string | number>;
}

/** RN-33/RN-34: una alerta por cotización, tipo y fecha de referencia (el ciclo). */
export function alertsFor(
  candidates: readonly AlertCandidate[],
  today: string,
  { expiringAlertDays, followUpDays }: { expiringAlertDays: number; followUpDays: number },
): NewNotification[] {
  return candidates.flatMap((candidate) => {
    const base = {
      userId: candidate.ownerId,
      quoteId: candidate.quoteId,
      params: {
        quoteId: candidate.quoteId,
        quoteNumber: formatQuoteNumber(candidate.number),
        customerName: candidate.customerName,
      },
    };
    const alerts: NewNotification[] = [];
    if (isExpiringSoon(candidate.expiresAt, today, expiringAlertDays)) {
      alerts.push({
        ...base,
        type: 'QUOTE_EXPIRING',
        referenceDate: candidate.expiresAt,
        params: { ...base.params, expiresAt: candidate.expiresAt },
      });
    }
    const reference = followUpReferenceDate(candidate.lastInteractionDay, candidate.sentDay);
    if (isWithoutFollowUp(reference, today, followUpDays)) {
      alerts.push({
        ...base,
        type: 'QUOTE_NO_FOLLOW_UP',
        referenceDate: reference,
        params: { ...base.params, days: daysBetweenDays(reference, today) },
      });
    }
    return alerts;
  });
}
