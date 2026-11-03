import { DEFAULT_PAGE_SIZE, type QuoteListDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { useDebouncedValue } from '../../../shared/lib';
import { quotesService } from '../services/quotes.service';
import { useQuoteFiltersStore } from '../store/quote-filters.store';

type QuotesState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: QuoteListDto };

export function useQuotes() {
  const statuses = useQuoteFiltersStore((state) => state.statuses);
  const q = useQuoteFiltersStore((state) => state.q);
  const customerId = useQuoteFiltersStore((state) => state.customer?.id);
  const ownerId = useQuoteFiltersStore((state) => state.owner?.id);
  const page = useQuoteFiltersStore((state) => state.page);
  const search = useDebouncedValue(q.trim(), 250);
  const [state, setState] = useState<QuotesState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const statusKey = statuses.join(',');

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    quotesService
      .list(
        {
          statuses: statusKey ? (statusKey.split(',') as typeof statuses) : [],
          q: search || undefined,
          customerId,
          ownerId,
          page,
          pageSize: DEFAULT_PAGE_SIZE,
        },
        controller.signal,
      )
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [statusKey, search, customerId, ownerId, page, version]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((value) => value + 1);
  }, []);

  return { state, reload };
}
