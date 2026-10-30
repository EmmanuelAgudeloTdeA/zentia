import type { CompanySettingsDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { companyService } from '../services/company.service';

type SettingsState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; settings: CompanySettingsDto };

export function useCompanySettings() {
  const [state, setState] = useState<SettingsState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', settings: await companyService.getSettings() });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = useCallback((settings: CompanySettingsDto) => {
    setState({ status: 'ready', settings });
  }, []);

  return { state, reload: load, replace };
}
