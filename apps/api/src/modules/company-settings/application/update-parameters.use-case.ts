import type { CompanySettingsDto, UpdateCommercialParametersRequest } from '@zentia/shared';
import { commercialParametersOf, mergeCommercialParameters } from '../domain/index.js';
import { toCompanySettingsDto } from './company-settings-dto.js';
import type { CompanySettingsRepository } from './ports/index.js';

export class UpdateParametersUseCase {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  async execute(changes: UpdateCommercialParametersRequest): Promise<CompanySettingsDto> {
    const current = commercialParametersOf(await this.deps.settings.get());
    const merged = mergeCommercialParameters(current, changes);
    return toCompanySettingsDto(await this.deps.settings.update(merged));
  }
}
