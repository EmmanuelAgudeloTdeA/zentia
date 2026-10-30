import type { CompanySettingsRepository } from './ports/index.js';

export type SeedCompanySettingsResult = 'created' | 'exists';

export class SeedCompanySettingsUseCase {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  async execute(): Promise<SeedCompanySettingsResult> {
    return (await this.deps.settings.createIfMissing()) ? 'created' : 'exists';
  }
}
