import type { OrderStatus } from '@zentia/shared';
import { create } from 'zustand';

interface OrdersFiltersState {
  statuses: OrderStatus[];
  q: string;
  page: number;
  toggleStatus: (status: OrderStatus) => void;
  clearStatuses: () => void;
  setQ: (q: string) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

const INITIAL = { statuses: [] as OrderStatus[], q: '', page: 1 };

export const useOrdersFiltersStore = create<OrdersFiltersState>()((set) => ({
  ...INITIAL,
  toggleStatus: (status) =>
    set((state) => ({
      statuses: state.statuses.includes(status)
        ? state.statuses.filter((item) => item !== status)
        : [...state.statuses, status],
      page: 1,
    })),
  clearStatuses: () => set({ statuses: [], page: 1 }),
  setQ: (q) => set({ q, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}));
