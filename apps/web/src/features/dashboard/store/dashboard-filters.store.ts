import { create } from 'zustand';
import { useSessionStore } from '../../../core/auth';

export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'last90Days' | 'custom';

interface DashboardFiltersState {
  preset: PeriodPreset;
  /** Solo con `custom`. */
  customFrom: string;
  customTo: string;
  owner: { id: string; label: string } | null;
  ownerInput: string;
  setPreset: (preset: PeriodPreset) => void;
  setCustom: (from: string, to: string) => void;
  setOwnerInput: (value: string) => void;
  pickOwner: (owner: { id: string; label: string }) => void;
  clearOwner: () => void;
  reset: () => void;
}

const INITIAL = {
  preset: 'thisMonth' as PeriodPreset,
  customFrom: '',
  customTo: '',
  owner: null,
  ownerInput: '',
};

/** Se recuerda la última elección al volver al tablero (S8.1.4). */
export const useDashboardFiltersStore = create<DashboardFiltersState>()((set) => ({
  ...INITIAL,
  setPreset: (preset) => set({ preset }),
  setCustom: (customFrom, customTo) => set({ customFrom, customTo }),
  setOwnerInput: (ownerInput) =>
    set(ownerInput.trim() === '' ? { ownerInput, owner: null } : { ownerInput }),
  pickOwner: (owner) => set({ owner, ownerInput: owner.label }),
  clearOwner: () => set({ owner: null, ownerInput: '' }),
  reset: () => set(INITIAL),
}));

// Al cambiar de usuario (logout o sesión expirada) no se conservan los filtros del anterior.
useSessionStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useDashboardFiltersStore.getState().reset();
});
