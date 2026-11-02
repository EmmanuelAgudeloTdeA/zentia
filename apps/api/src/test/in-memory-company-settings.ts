import type {
  CompanySettingsInfrastructure,
  CompanySettingsPatch,
  CompanySettingsRepository,
} from '../modules/company-settings/application/index.js';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '../modules/company-settings/domain/index.js';
import { SignatureImageInspector } from '../modules/company-settings/infrastructure/index.js';

export class InMemoryCompanySettingsRepository implements CompanySettingsRepository {
  row: CompanySettings | null = null;

  async get(): Promise<CompanySettings> {
    this.row ??= { ...DEFAULT_COMPANY_SETTINGS, updatedAt: new Date() };
    return { ...this.row };
  }

  async update({ bumpLogoVersion, ...patch }: CompanySettingsPatch): Promise<CompanySettings> {
    const current = await this.get();
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    this.row = {
      ...current,
      ...defined,
      logoVersion: current.logoVersion + (bumpLogoVersion ? 1 : 0),
      updatedAt: new Date(),
    };
    return { ...this.row };
  }

  async createIfMissing(): Promise<boolean> {
    if (this.row) return false;
    await this.get();
    return true;
  }
}

export interface InMemoryCompanySettings extends CompanySettingsInfrastructure {
  settings: InMemoryCompanySettingsRepository;
}

export function createInMemoryCompanySettings(): InMemoryCompanySettings {
  return {
    settings: new InMemoryCompanySettingsRepository(),
    imageInspector: new SignatureImageInspector(),
  };
}
