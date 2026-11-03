import { DEFAULT_PAGE_SIZE, type CustomerListDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { useDebouncedValue } from '../../../shared/lib';
import { customersService } from '../services/customers.service';
import { useCustomersFiltersStore } from '../store/customers-filters.store';

type CustomersState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: CustomerListDto };

export function useCustomers() {
  const q = useCustomersFiltersStore((state) => state.q);
  const status = useCustomersFiltersStore((state) => state.status);
  const page = useCustomersFiltersStore((state) => state.page);
  const search = useDebouncedValue(q.trim(), 250);
  const [state, setState] = useState<CustomersState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    customersService
      .list(
        { q: search || undefined, status, page, pageSize: DEFAULT_PAGE_SIZE },
        controller.signal,
      )
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [search, status, page, version]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((value) => value + 1);
  }, []);

  return { state, reload };
}
