import type { QuoteSummaryDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useSessionStore } from '../../../core/auth';
import { formatCop, formatDate } from '../../../core/format';
import { Button, ErrorMessage, SectionCard, Skeleton } from '../../../shared/ui';
import { quotesService } from '../services/quotes.service';
import { quotePath } from './quote-paths';
import { QuoteStatusBadge } from './quote-status-badge';

const PAGE_SIZE = 5;

/** Sección "Cotizaciones" del detalle de cliente; el back limita al vendedor a las suyas. */
export function CustomerQuotesSection({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const isSeller = useSessionStore((state) => state.user?.role === 'SELLER');
  const [items, setItems] = useState<QuoteSummaryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (nextPage: number) => {
      if (nextPage === 1) setStatus('loading');
      else setLoadingMore(true);
      try {
        const result = await quotesService.list({
          statuses: [],
          customerId,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        setItems((current) => (nextPage === 1 ? result.items : [...current, ...result.items]));
        setTotal(result.total);
        setPage(nextPage);
        setStatus('ready');
      } catch (loadError) {
        setError(loadError);
        setStatus('error');
      } finally {
        setLoadingMore(false);
      }
    },
    [customerId],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <SectionCard
      title={t('customers.quotes.title')}
      {...(isSeller ? { description: t('customers.quotes.ownOnly') } : {})}
    >
      {status === 'loading' ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : status === 'error' ? (
        <ErrorMessage error={error} onRetry={() => void load(1)} />
      ) : items.length === 0 ? (
        <p className="text-body-sm text-neutral-600">{t('customers.quotes.empty')}</p>
      ) : (
        <>
          <ul aria-label={t('customers.quotes.title')} className="divide-y divide-neutral-200">
            {items.map((quote) => (
              <li
                key={quote.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <Link
                    to={quotePath(quote.id)}
                    className="font-mono font-medium text-primary-600 hover:underline"
                  >
                    {quote.displayNumber}
                  </Link>
                  <QuoteStatusBadge status={quote.status} size="sm" />
                </div>
                <div className="flex items-center gap-4 text-body-sm">
                  <span className="text-neutral-500">
                    {t('customers.quotes.updatedAt', { date: formatDate(quote.updatedAt) })}
                  </span>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {formatCop(quote.total)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {items.length < total ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              loading={loadingMore}
              onClick={() => void load(page + 1)}
            >
              {t('customers.quotes.loadMore')}
            </Button>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
