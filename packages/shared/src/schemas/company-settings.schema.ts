import { z } from 'zod';
import { DOCUMENT_LOCALES, VAT_RATES } from '../enums/index.js';
import { percentString } from './decimal.schema.js';

export const vatRateSchema = z.enum(VAT_RATES);
export const documentLocaleSchema = z.enum(DOCUMENT_LOCALES);

export const COMMERCIAL_PARAMETER_RANGES = {
  validityDays: { min: 1, max: 365 },
  expiringAlertDays: { min: 1 },
  followUpDays: { min: 1, max: 90 },
  coldStartThreshold: { min: 30, max: 50 },
} as const;

export const COMMERCIAL_TERMS_MAX_LENGTH = 2000;

/** Clave de `lang/` del issue cuando X no es menor que N. */
export const EXPIRING_ALERT_DAYS_LT_VALIDITY = 'validation.parameters.expiringAlertDaysLtValidity';

const { validityDays, expiringAlertDays, followUpDays, coldStartThreshold } =
  COMMERCIAL_PARAMETER_RANGES;

const commercialParametersShape = {
  defaultVatRate: vatRateSchema,
  validityDays: z.int().min(validityDays.min).max(validityDays.max),
  discountLimitSeller: percentString,
  discountLimitManager: percentString,
  discountLimitAdmin: percentString,
  shippingTaxable: z.boolean(),
  expiringAlertDays: z.int().min(expiringAlertDays.min),
  followUpDays: z.int().min(followUpDays.min).max(followUpDays.max),
  coldStartThreshold: z.int().min(coldStartThreshold.min).max(coldStartThreshold.max),
};

/** Parámetros completos con la validación cruzada X < N; se aplica sobre actual ⊕ cambios. */
export const commercialParametersSchema = z
  .object(commercialParametersShape)
  .superRefine((values, ctx) => {
    if (values.expiringAlertDays >= values.validityDays) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiringAlertDays'],
        message: EXPIRING_ALERT_DAYS_LT_VALIDITY,
        params: { max: values.validityDays - 1 },
      });
    }
  });

export type CommercialParameters = z.infer<typeof commercialParametersSchema>;

export const updateCommercialParametersSchema = z.object(commercialParametersShape).partial();

export type UpdateCommercialParametersRequest = z.infer<typeof updateCommercialParametersSchema>;

/** Texto opcional: vacío equivale a `null` (borra el valor). */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));
}

const companyEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .nullable()
  .transform((value) => (value ? value : null))
  .pipe(z.email().max(150).nullable());

export const updateCompanyProfileSchema = z
  .object({
    name: optionalText(150),
    taxId: optionalText(30),
    address: optionalText(250),
    phone: optionalText(30),
    email: companyEmailSchema,
    commercialTerms: optionalText(COMMERCIAL_TERMS_MAX_LENGTH),
    documentLocale: documentLocaleSchema,
  })
  .partial();

export type UpdateCompanyProfileRequest = z.input<typeof updateCompanyProfileSchema>;

export type CompanyProfileChanges = z.output<typeof updateCompanyProfileSchema>;

export const companySettingsDtoSchema = z.object({
  name: z.string().nullable(),
  taxId: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  commercialTerms: z.string().nullable(),
  documentLocale: documentLocaleSchema,
  hasLogo: z.boolean(),
  logoVersion: z.int(),
  defaultVatRate: vatRateSchema,
  validityDays: z.int(),
  discountLimitSeller: z.string(),
  discountLimitManager: z.string(),
  discountLimitAdmin: z.string(),
  shippingTaxable: z.boolean(),
  expiringAlertDays: z.int(),
  followUpDays: z.int(),
  coldStartThreshold: z.int(),
  updatedAt: z.iso.datetime(),
});

export type CompanySettingsDto = z.infer<typeof companySettingsDtoSchema>;

export const brandingDtoSchema = z.object({
  name: z.string().nullable(),
  hasLogo: z.boolean(),
  logoVersion: z.int(),
});

export type BrandingDto = z.infer<typeof brandingDtoSchema>;

export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg'] as const;

export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number];

/** Tamaño máximo del logo decodificado. */
export const LOGO_MAX_BYTES = 512 * 1024;

export const uploadLogoRequestSchema = z.object({
  mimeType: z.string(),
  data: z.base64().min(1),
});

export type UploadLogoRequest = z.infer<typeof uploadLogoRequestSchema>;

export const logoUploadResultSchema = z.object({
  hasLogo: z.literal(true),
  logoVersion: z.int(),
});

export type LogoUploadResult = z.infer<typeof logoUploadResultSchema>;
