import { zodResolver } from '@hookform/resolvers/zod';
import {
  commercialParametersSchema,
  updateCompanyProfileSchema,
  type CommercialParameters,
  type CompanyProfileChanges,
  type CompanySettingsDto,
  type UpdateCompanyProfileRequest,
} from '@zentia/shared';
import { useForm, type UseFormReturn } from 'react-hook-form';

export const PROFILE_FIELDS = [
  'name',
  'taxId',
  'address',
  'city',
  'phone',
  'email',
  'website',
  'bankAccounts',
  'commercialTerms',
  'documentLocale',
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PARAMETER_FIELDS = [
  'defaultVatRate',
  'validityDays',
  'discountLimitSeller',
  'discountLimitManager',
  'discountLimitAdmin',
  'shippingTaxable',
  'expiringAlertDays',
  'followUpDays',
  'coldStartThreshold',
] as const satisfies readonly (keyof CommercialParameters)[];

export type ParameterField = (typeof PARAMETER_FIELDS)[number];

export type ProfileForm = UseFormReturn<
  UpdateCompanyProfileRequest,
  unknown,
  CompanyProfileChanges
>;
export type ParametersForm = UseFormReturn<CommercialParameters>;

export function toProfileValues(settings: CompanySettingsDto): UpdateCompanyProfileRequest {
  return {
    name: settings.name ?? '',
    taxId: settings.taxId ?? '',
    address: settings.address ?? '',
    city: settings.city ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    website: settings.website ?? '',
    bankAccounts: settings.bankAccounts ?? '',
    commercialTerms: settings.commercialTerms ?? '',
    documentLocale: settings.documentLocale,
  };
}

export function toParameterValues(settings: CompanySettingsDto): CommercialParameters {
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

export function useProfileForm(settings: CompanySettingsDto): ProfileForm {
  return useForm<UpdateCompanyProfileRequest, unknown, CompanyProfileChanges>({
    resolver: zodResolver(updateCompanyProfileSchema),
    mode: 'onTouched',
    defaultValues: toProfileValues(settings),
  });
}

export function useParametersForm(settings: CompanySettingsDto): ParametersForm {
  return useForm<CommercialParameters>({
    resolver: zodResolver(commercialParametersSchema),
    mode: 'onTouched',
    defaultValues: toParameterValues(settings),
  });
}

export const integerInput = {
  setValueAs: (value: string) => (value === '' ? Number.NaN : Number(value)),
};
export const percentInput = { setValueAs: (value: string) => value.trim().replace(',', '.') };
