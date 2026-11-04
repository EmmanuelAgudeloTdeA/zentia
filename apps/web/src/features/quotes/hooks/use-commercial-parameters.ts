import type { CompanySettingsDto, DocumentLocale, Role } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { companyService } from '../../company-settings';

export interface CommercialParameters {
  discountLimits: Record<Role, string>;
  validityDays: number;
  expiringAlertDays: number;
  followUpDays: number;
  shippingTaxable: boolean;
  documentLocale: DocumentLocale;
}

const FALLBACK: CommercialParameters = {
  discountLimits: { SELLER: '10', MANAGER: '30', ADMIN: '30' },
  validityDays: 15,
  expiringAlertDays: 3,
  followUpDays: 5,
  shippingTaxable: false,
  documentLocale: 'es',
};

function fromSettings(settings: CompanySettingsDto): CommercialParameters {
  return {
    discountLimits: {
      SELLER: settings.discountLimitSeller,
      MANAGER: settings.discountLimitManager,
      ADMIN: settings.discountLimitAdmin,
    },
    validityDays: settings.validityDays,
    expiringAlertDays: settings.expiringAlertDays,
    followUpDays: settings.followUpDays,
    shippingTaxable: settings.shippingTaxable,
    documentLocale: settings.documentLocale,
  };
}

export interface CommercialParametersState extends CommercialParameters {
  ready: boolean;
  /** Error de carga: los valores son los de respaldo y la vista previa puede no coincidir con el back. */
  error: unknown;
  retry: () => void;
}

/** Parámetros de M2 para la vista previa; el back siempre vuelve a validar con los vigentes. */
export function useCommercialParameters(): CommercialParametersState {
  const [state, setState] = useState<{
    ready: boolean;
    params: CommercialParameters;
    error: unknown;
  }>({ ready: false, params: FALLBACK, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    companyService
      .getSettings()
      .then(
        (settings) =>
          !cancelled && setState({ ready: true, params: fromSettings(settings), error: null }),
      )
      .catch(
        (error: unknown) =>
          !cancelled && setState({ ready: true, params: FALLBACK, error: error ?? true }),
      );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, ready: false, error: null }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state.params, ready: state.ready, error: state.error, retry };
}
