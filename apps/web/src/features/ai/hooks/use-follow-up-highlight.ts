import { daysBetweenDays, followUpReferenceDate, isWithoutFollowUp } from '@zentia/shared';
import { useEffect, useState } from 'react';
import { todayInBogota } from '../../../core/format';
import { interactionsService } from '../../follow-up';

export interface FollowUpHighlight {
  highlighted: boolean;
  days: number;
}

/** Regla de Y días de M6 (RN-33) al abrir el detalle; el back la confirma al sugerir el mensaje. */
export function useFollowUpHighlight(
  quote: { id: string; customerId: string; status: string; sentAt: string | null },
  followUpDays: number | null,
  refreshKey = 0,
): FollowUpHighlight | null {
  const [highlight, setHighlight] = useState<FollowUpHighlight | null>(null);
  const { id, customerId, status, sentAt } = quote;

  useEffect(() => {
    if (status !== 'SENT' || !sentAt || !customerId || followUpDays === null) {
      setHighlight(null);
      return;
    }
    let cancelled = false;
    // Como en M6: cuenta la última de esta cotización y la última del cliente sin cotización.
    Promise.all([
      interactionsService.list({ quoteId: id, page: 1, pageSize: 1 }),
      interactionsService.list({ customerId, withoutQuote: 'true', page: 1, pageSize: 1 }),
    ])
      .then(([own, general]) => {
        const days = [own.items[0], general.items[0]]
          .filter((item) => item !== undefined)
          .map((item) => todayInBogota(new Date(item.occurredAt)))
          .sort();
        const last = days.at(-1) ?? null;
        const today = todayInBogota();
        const reference = followUpReferenceDate(last, todayInBogota(new Date(sentAt)));
        if (!cancelled) {
          setHighlight({
            highlighted: isWithoutFollowUp(reference, today, followUpDays),
            days: daysBetweenDays(reference, today),
          });
        }
      })
      .catch(() => !cancelled && setHighlight(null));
    return () => {
      cancelled = true;
    };
  }, [id, customerId, status, sentAt, followUpDays, refreshKey]);

  return highlight;
}
