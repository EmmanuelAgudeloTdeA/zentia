import { DEFAULT_PAGE_SIZE, type ProductDto, type ProductListDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { useDebouncedValue } from '../../../shared/lib';
import { productsService } from '../services/products.service';
import { useProductsFiltersStore } from '../store/products-filters.store';

type ProductsState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: ProductListDto };

export function useProducts() {
  const q = useProductsFiltersStore((state) => state.q);
  const category = useProductsFiltersStore((state) => state.category);
  const status = useProductsFiltersStore((state) => state.status);
  const page = useProductsFiltersStore((state) => state.page);
  const search = useDebouncedValue(q.trim(), 250);
  const [state, setState] = useState<ProductsState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    productsService
      .list(
        {
          q: search || undefined,
          category: category || undefined,
          status,
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
  }, [search, category, status, page, version]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((value) => value + 1);
  }, []);

  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  const replaceProduct = useCallback((product: ProductDto) => {
    setState((current) =>
      current.status === 'ready'
        ? {
            status: 'ready',
            data: {
              ...current.data,
              items: current.data.items.map((item) => (item.id === product.id ? product : item)),
            },
          }
        : current,
    );
  }, []);

  return { state, reload, refresh, replaceProduct };
}
