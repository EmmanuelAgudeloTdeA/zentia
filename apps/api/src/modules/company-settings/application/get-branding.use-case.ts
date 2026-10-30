import type { BrandingDto } from '@zentia/shared';
import { toBrandingDto } from './company-settings-dto.js';
import type { CompanySettingsRepository } from './ports/index.js';

export class GetBrandingUseCase {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  async execute(): Promise<BrandingDto> {
    return toBrandingDto(await this.deps.settings.get());
  }
}
