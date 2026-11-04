import type { CompanySettingsDto, DocumentLocale, Role } from '@zentia/shared';
import { useEffect, useState } from 'react';
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

/** Parámetros de M2 para la vista previa; el back siempre vuelve a validar con los vigentes. */
export function useCommercialParameters(): CommercialParameters & { ready: boolean } {
  const [state, setState] = useState<{ ready: boolean; params: CommercialParameters }>({
    ready: false,
    params: FALLBACK,
  });

  useEffect(() => {
    let cancelled = false;
    companyService
      .getSettings()
      .then((settings) => !cancelled && setState({ ready: true, params: fromSettings(settings) }))
      .catch(() => !cancelled && setState({ ready: true, params: FALLBACK }));
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state.params, ready: state.ready };
}
