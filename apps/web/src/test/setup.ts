import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { useSessionStore } from '../core/auth';
import { useBrandingStore } from '../core/branding';
import { initI18n, useLocaleStore } from '../core/i18n';

initI18n();

afterEach(() => {
  cleanup();
  useSessionStore.getState().clearSession();
  useBrandingStore.setState({ name: null, hasLogo: false, logoVersion: 0, status: 'loading' });
  useLocaleStore.getState().setLocale('es');
  localStorage.clear();
});
