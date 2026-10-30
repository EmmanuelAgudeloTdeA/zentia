import type { CompanySettings } from '../../domain/index.js';

export type CompanySettingsPatch = Partial<Omit<CompanySettings, 'logoVersion' | 'updatedAt'>> & {
  /** Aumenta `logoVersion` en la misma escritura (subida o eliminación efectiva del logo). */
  bumpLogoVersion?: boolean;
};

export interface CompanySettingsRepository {
  get(): Promise<CompanySettings>;
  update(patch: CompanySettingsPatch): Promise<CompanySettings>;
  createIfMissing(): Promise<boolean>;
}
