import type { CompanyProfileChanges, CompanySettingsDto } from '@zentia/shared';
import { toCompanySettingsDto } from './company-settings-dto.js';
import type { CompanySettingsPatch, CompanySettingsRepository } from './ports/index.js';

export class UpdateProfileUseCase {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  async execute(changes: CompanyProfileChanges): Promise<CompanySettingsDto> {
    const patch = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as CompanySettingsPatch;
    return toCompanySettingsDto(await this.deps.settings.update(patch));
  }
}
