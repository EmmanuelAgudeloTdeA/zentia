import type { BrandingDto, CompanySettingsDto } from '@zentia/shared';
import type { CompanySettings } from '../domain/index.js';

/** DTO de configuración: nunca incluye el logo, solo `hasLogo`. */
export function toCompanySettingsDto(settings: CompanySettings): CompanySettingsDto {
  const { logoDataUrl, updatedAt, ...rest } = settings;
  return { ...rest, hasLogo: logoDataUrl !== null, updatedAt: updatedAt.toISOString() };
}

export function toBrandingDto(settings: CompanySettings): BrandingDto {
  return {
    name: settings.name,
    hasLogo: settings.logoDataUrl !== null,
    logoVersion: settings.logoVersion,
  };
}
