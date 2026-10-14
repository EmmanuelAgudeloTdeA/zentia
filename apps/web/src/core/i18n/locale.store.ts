import { DEFAULT_LOCALE, type Locale } from '@zentia/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'zentia.locale', storage: createJSONStorage(() => localStorage) },
  ),
);
