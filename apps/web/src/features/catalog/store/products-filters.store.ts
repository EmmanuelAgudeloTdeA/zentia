import type { ActiveStatusFilter } from '@zentia/shared';
import { create } from 'zustand';

interface ProductsFiltersState {
  q: string;
  /** Categoría elegida en el autocompletado (`''` = todas). */
  category: string;
  categoryInput: string;
  status: ActiveStatusFilter;
  page: number;
  setQ: (q: string) => void;
  setCategoryInput: (value: string) => void;
  selectCategory: (category: string) => void;
  setStatus: (status: ActiveStatusFilter) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

const INITIAL = { q: '', category: '', categoryInput: '', status: 'active', page: 1 } as const;

export const useProductsFiltersStore = create<ProductsFiltersState>()((set) => ({
  ...INITIAL,
  setQ: (q) => set({ q, page: 1 }),
  setCategoryInput: (categoryInput) =>
    set(categoryInput.trim() === '' ? { categoryInput, category: '', page: 1 } : { categoryInput }),
  selectCategory: (category) => set({ category, categoryInput: category, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(INITIAL),
}));
