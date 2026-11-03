import type { ActiveStatusFilter } from '@zentia/shared';
import { create } from 'zustand';

interface CustomersFiltersState {
  q: string;
  status: ActiveStatusFilter;
  page: number;
  setQ: (q: string) => void;
  setStatus: (status: ActiveStatusFilter) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

const INITIAL = { q: '', status: 'active', page: 1 } as const;

export const useCustomersFiltersStore = create<CustomersFiltersState>()((set) => ({
  ...INITIAL,
  setQ: (q) => set({ q, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}));
