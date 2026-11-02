import type { CompanySettingsDto } from '@zentia/shared';
import { toCompanySettingsDto } from './company-settings-dto.js';
import type { CompanySettingsRepository } from './ports/index.js';

export class GetSettingsUseCase {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  async execute(): Promise<CompanySettingsDto> {
    return toCompanySettingsDto(await this.deps.settings.get());
  }
}
