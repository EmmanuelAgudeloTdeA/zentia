import type { QuoteStatus } from '@zentia/shared';
import { create } from 'zustand';

export interface PickedFilter {
  id: string;
  label: string;
}

interface QuoteFiltersState {
  statuses: QuoteStatus[];
  q: string;
  customer: PickedFilter | null;
  customerInput: string;
  owner: PickedFilter | null;
  ownerInput: string;
  page: number;
  toggleStatus: (status: QuoteStatus) => void;
  clearStatuses: () => void;
  setQ: (q: string) => void;
  setCustomerInput: (value: string) => void;
  pickCustomer: (customer: PickedFilter) => void;
  setOwnerInput: (value: string) => void;
  pickOwner: (owner: PickedFilter) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

const INITIAL = {
  statuses: [] as QuoteStatus[],
  q: '',
  customer: null,
  customerInput: '',
  owner: null,
  ownerInput: '',
  page: 1,
};

export const useQuoteFiltersStore = create<QuoteFiltersState>()((set) => ({
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
  setCustomerInput: (customerInput) =>
    set(
      customerInput.trim() === '' ? { customerInput, customer: null, page: 1 } : { customerInput },
    ),
  pickCustomer: (customer) => set({ customer, customerInput: customer.label, page: 1 }),
  setOwnerInput: (ownerInput) =>
    set(ownerInput.trim() === '' ? { ownerInput, owner: null, page: 1 } : { ownerInput }),
  pickOwner: (owner) => set({ owner, ownerInput: owner.label, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}));

export function hasQuoteFilters(
  state: Pick<QuoteFiltersState, 'statuses' | 'q' | 'customer' | 'owner'>,
) {
  return (
    state.statuses.length > 0 ||
    state.q.trim() !== '' ||
    state.customer !== null ||
    state.owner !== null
  );
}
