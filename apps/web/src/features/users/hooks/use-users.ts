import { USERS_PAGE_SIZE, type UserDto, type UserListDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { usersService } from '../services/users.service';
import { useUsersFiltersStore } from '../store/users-filters.store';

const SEARCH_DEBOUNCE_MS = 250;

type UsersState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: UserListDto };

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useUsers() {
  const q = useUsersFiltersStore((state) => state.q);
  const role = useUsersFiltersStore((state) => state.role);
  const status = useUsersFiltersStore((state) => state.status);
  const page = useUsersFiltersStore((state) => state.page);
  const search = useDebounced(q.trim(), SEARCH_DEBOUNCE_MS);
  const [state, setState] = useState<UsersState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    usersService
      .list(
        {
          q: search || undefined,
          role: role || undefined,
          isActive: status ? status === 'active' : undefined,
          page,
          pageSize: USERS_PAGE_SIZE,
        },
        controller.signal,
      )
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [search, role, status, page, version]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((value) => value + 1);
  }, []);

  /** Actualiza una fila sin volver a pedir la página. */
  const replaceUser = useCallback((user: UserDto) => {
    setState((current) =>
      current.status === 'ready'
        ? {
            status: 'ready',
            data: {
              ...current.data,
              items: current.data.items.map((item) => (item.id === user.id ? user : item)),
            },
          }
        : current,
    );
  }, []);

  return { state, reload, refresh: () => setVersion((value) => value + 1), replaceUser };
}
