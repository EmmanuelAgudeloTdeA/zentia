import type { Role } from '@zentia/shared';
import { create } from 'zustand';

export type UserStatusFilter = '' | 'active' | 'inactive';

interface UsersFiltersState {
  q: string;
  role: Role | '';
  status: UserStatusFilter;
  page: number;
  setQ: (q: string) => void;
  setRole: (role: Role | '') => void;
  setStatus: (status: UserStatusFilter) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

const INITIAL = { q: '', role: '', status: '', page: 1 } as const;

export const useUsersFiltersStore = create<UsersFiltersState>()((set) => ({
  ...INITIAL,
  setQ: (q) => set({ q, page: 1 }),
  setRole: (role) => set({ role, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}));

export function hasActiveFilters({
  q,
  role,
  status,
}: Pick<UsersFiltersState, 'q' | 'role' | 'status'>) {
  return q.trim() !== '' || role !== '' || status !== '';
}
