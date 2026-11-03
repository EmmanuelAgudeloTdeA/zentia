import type { CustomerDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { customersService } from '../services/customers.service';

type CustomerState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; customer: CustomerDto };

export function useCustomer(id: string) {
  const [state, setState] = useState<CustomerState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', customer: await customersService.get(id) });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = useCallback(
    (customer: CustomerDto) => setState({ status: 'ready', customer }),
    [],
  );

  return { state, reload: load, replace };
}
