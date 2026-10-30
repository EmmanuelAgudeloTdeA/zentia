import { Decimal, type DocumentLocale, type Role, type VatRate } from '@zentia/shared';
import type { CompanySettingsRepository } from './ports/index.js';

export interface CommercialParametersDto {
  readonly defaultVatRate: VatRate;
  readonly validityDays: number;
  readonly discountLimits: Readonly<Record<Role, Decimal>>;
  readonly shippingTaxable: boolean;
  readonly expiringAlertDays: number;
  readonly followUpDays: number;
  readonly coldStartThreshold: number;
}

export interface DocumentProfileDto {
  readonly name: string | null;
  readonly taxId: string | null;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly commercialTerms: string | null;
  readonly documentLocale: DocumentLocale;
  readonly logoDataUrl: string | null;
}

/** Puerto público de lectura de la configuración para los demás módulos. */
export interface SettingsReader {
  getCommercialParameters(): Promise<CommercialParametersDto>;
  getDocumentProfile(): Promise<DocumentProfileDto>;
}

/** Lee la fila en cada llamada (sin caché en el MVP, decisión 108). */
export class CompanySettingsReader implements SettingsReader {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  async getCommercialParameters(): Promise<CommercialParametersDto> {
    const settings = await this.deps.settings.get();
    return Object.freeze({
      defaultVatRate: settings.defaultVatRate,
      validityDays: settings.validityDays,
      discountLimits: Object.freeze({
        SELLER: new Decimal(settings.discountLimitSeller),
        MANAGER: new Decimal(settings.discountLimitManager),
        ADMIN: new Decimal(settings.discountLimitAdmin),
      }),
      shippingTaxable: settings.shippingTaxable,
      expiringAlertDays: settings.expiringAlertDays,
      followUpDays: settings.followUpDays,
      coldStartThreshold: settings.coldStartThreshold,
    });
  }

  async getDocumentProfile(): Promise<DocumentProfileDto> {
    const settings = await this.deps.settings.get();
    return Object.freeze({
      name: settings.name,
      taxId: settings.taxId,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      commercialTerms: settings.commercialTerms,
      documentLocale: settings.documentLocale,
      logoDataUrl: settings.logoDataUrl,
    });
  }
}
