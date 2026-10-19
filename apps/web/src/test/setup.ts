import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { useSessionStore } from '../core/auth';
import { initI18n, useLocaleStore } from '../core/i18n';

initI18n();

afterEach(() => {
  cleanup();
  useSessionStore.getState().clearSession();
  useLocaleStore.getState().setLocale('es');
  localStorage.clear();
});
