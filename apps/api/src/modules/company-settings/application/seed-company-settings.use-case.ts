import type { CompanySettingsRepository } from './ports/index.js';

export type SeedCompanySettingsResult = 'created' | 'exists';

/** Crea la fila id = 1 con los valores por defecto; si ya existe, no la modifica. */
export class SeedCompanySettingsUseCase {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  async execute(): Promise<SeedCompanySettingsResult> {
    return (await this.deps.settings.createIfMissing()) ? 'created' : 'exists';
  }
}
