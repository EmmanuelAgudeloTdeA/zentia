import type { DocumentLocale, VatRate } from '@zentia/shared';

/** Fila única de configuración; los porcentajes viajan como string decimal. */
export interface CompanySettings {
  name: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  commercialTerms: string | null;
  documentLocale: DocumentLocale;
  logoDataUrl: string | null;
  logoVersion: number;
  defaultVatRate: VatRate;
  validityDays: number;
  discountLimitSeller: string;
  discountLimitManager: string;
  discountLimitAdmin: string;
  shippingTaxable: boolean;
  expiringAlertDays: number;
  followUpDays: number;
  coldStartThreshold: number;
  updatedAt: Date;
}

export type CompanyProfile = Pick<
  CompanySettings,
  'name' | 'taxId' | 'address' | 'phone' | 'email' | 'commercialTerms' | 'documentLocale'
>;

export const DEFAULT_COMPANY_SETTINGS: Omit<CompanySettings, 'updatedAt'> = {
  name: null,
  taxId: null,
  address: null,
  phone: null,
  email: null,
  commercialTerms: null,
  documentLocale: 'es',
  logoDataUrl: null,
  logoVersion: 0,
  defaultVatRate: 'GENERAL_19',
  validityDays: 15,
  discountLimitSeller: '10',
  discountLimitManager: '30',
  discountLimitAdmin: '30',
  shippingTaxable: false,
  expiringAlertDays: 3,
  followUpDays: 5,
  coldStartThreshold: 30,
};
