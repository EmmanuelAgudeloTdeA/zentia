import type { CompanySettingsRepository } from './ports/index.js';

export class DeleteLogoUseCase {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  /** Idempotente: la versión solo aumenta si había logo. */
  async execute(): Promise<void> {
    const current = await this.deps.settings.get();
    if (current.logoDataUrl === null) return;
    await this.deps.settings.update({ logoDataUrl: null, bumpLogoVersion: true });
  }
}
