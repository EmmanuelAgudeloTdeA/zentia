import type { HistoryEntryDto, QuoteDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { quotesService } from '../services/quotes.service';

type LoadState<T> =
  { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T };

function useLoader<T>(load: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });

  const reload = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', data: await load() });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const replace = useCallback((data: T) => setState({ status: 'ready', data }), []);
  return { state, reload, replace };
}

export function useQuote(id: string) {
  return useLoader<QuoteDto>(useCallback(() => quotesService.get(id), [id]));
}

export function useQuoteHistory(id: string) {
  return useLoader<HistoryEntryDto[]>(useCallback(() => quotesService.history(id), [id]));
}
