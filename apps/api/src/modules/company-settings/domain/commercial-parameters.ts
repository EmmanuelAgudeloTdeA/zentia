import {
  commercialParametersSchema,
  type CommercialParameters,
  type UpdateCommercialParametersRequest,
} from '@zentia/shared';
import type { CompanySettings } from './company-settings.js';

export function commercialParametersOf(settings: CompanySettings): CommercialParameters {
  return {
    defaultVatRate: settings.defaultVatRate,
    validityDays: settings.validityDays,
    discountLimitSeller: settings.discountLimitSeller,
    discountLimitManager: settings.discountLimitManager,
    discountLimitAdmin: settings.discountLimitAdmin,
    shippingTaxable: settings.shippingTaxable,
    expiringAlertDays: settings.expiringAlertDays,
    followUpDays: settings.followUpDays,
    coldStartThreshold: settings.coldStartThreshold,
  };
}

/** Valida rangos y X < N sobre actual ⊕ cambios; lanza ZodError con el path del campo. */
export function mergeCommercialParameters(
  current: CommercialParameters,
  patch: UpdateCommercialParametersRequest,
): CommercialParameters {
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<CommercialParameters>;
  return commercialParametersSchema.parse({ ...current, ...defined });
}
