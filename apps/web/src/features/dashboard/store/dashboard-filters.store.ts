import { create } from 'zustand';

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
}

/** Se recuerda la última elección al volver al tablero (S8.1.4). */
export const useDashboardFiltersStore = create<DashboardFiltersState>()((set) => ({
  preset: 'thisMonth',
  customFrom: '',
  customTo: '',
  owner: null,
  ownerInput: '',
  setPreset: (preset) => set({ preset }),
  setCustom: (customFrom, customTo) => set({ customFrom, customTo }),
  setOwnerInput: (ownerInput) =>
    set(ownerInput.trim() === '' ? { ownerInput, owner: null } : { ownerInput }),
  pickOwner: (owner) => set({ owner, ownerInput: owner.label }),
}));
