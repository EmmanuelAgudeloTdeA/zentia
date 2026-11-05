import type { QuoteStatus } from '@zentia/shared';
import { create } from 'zustand';

export interface PickedFilter {
  id: string;
  label: string;
}

/** Cohorte por `firstSentAt` en días de America/Bogota (`YYYY-MM-DD`), ambos extremos incluidos. */
export interface SentPeriod {
  from?: string | undefined;
  to?: string | undefined;
}

export interface QuoteListFilters {
  statuses?: readonly QuoteStatus[];
  owner?: PickedFilter | null;
  sentPeriod?: SentPeriod | null;
  /** Solo Enviadas sin seguimiento (regla de Y días de M6). */
  followUpPending?: boolean;
}

interface QuoteFiltersState {
  statuses: QuoteStatus[];
  q: string;
  customer: PickedFilter | null;
  customerInput: string;
  owner: PickedFilter | null;
  ownerInput: string;
  sentPeriod: SentPeriod | null;
  followUpPending: boolean;
  page: number;
  toggleStatus: (status: QuoteStatus) => void;
  clearStatuses: () => void;
  setQ: (q: string) => void;
  setCustomerInput: (value: string) => void;
  pickCustomer: (customer: PickedFilter) => void;
  setOwnerInput: (value: string) => void;
  pickOwner: (owner: PickedFilter) => void;
  setPage: (page: number) => void;
  clearSentPeriod: () => void;
  clearFollowUpPending: () => void;
  /** Reemplaza todos los filtros (p. ej., desde una tarjeta del tablero) para que los conteos coincidan. */
  applyFilters: (filters: QuoteListFilters) => void;
  reset: () => void;
}

const INITIAL = {
  statuses: [] as QuoteStatus[],
  q: '',
  customer: null,
  customerInput: '',
  owner: null,
  ownerInput: '',
  sentPeriod: null,
  followUpPending: false,
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
  clearSentPeriod: () => set({ sentPeriod: null, page: 1 }),
  clearFollowUpPending: () => set({ followUpPending: false, page: 1 }),
  applyFilters: ({ statuses = [], owner = null, sentPeriod = null, followUpPending = false }) =>
    set({
      ...INITIAL,
      statuses: [...statuses],
      owner,
      ownerInput: owner?.label ?? '',
      sentPeriod: sentPeriod?.from || sentPeriod?.to ? sentPeriod : null,
      followUpPending,
    }),
  reset: () => set(INITIAL),
}));

export function hasQuoteFilters(
  state: Pick<
    QuoteFiltersState,
    'statuses' | 'q' | 'customer' | 'owner' | 'sentPeriod' | 'followUpPending'
  >,
) {
  return (
    state.statuses.length > 0 ||
    state.q.trim() !== '' ||
    state.customer !== null ||
    state.owner !== null ||
    state.sentPeriod !== null ||
    state.followUpPending
  );
}

/** Abre la lista con estos filtros; quien la llama navega después a `QUOTES_PATH`. */
export function openQuotesWithFilters(filters: QuoteListFilters): void {
  useQuoteFiltersStore.getState().applyFilters(filters);
}
