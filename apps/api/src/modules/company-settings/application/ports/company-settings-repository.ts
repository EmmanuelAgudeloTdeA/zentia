import type { CompanySettings } from '../../domain/index.js';

export type CompanySettingsPatch = Partial<Omit<CompanySettings, 'logoVersion' | 'updatedAt'>> & {
  /** Aumenta `logoVersion` en la misma escritura (subida o eliminación efectiva del logo). */
  bumpLogoVersion?: boolean;
};

export interface CompanySettingsRepository {
  /** Lee la fila id = 1; si aún no existe, la crea con los valores por defecto. */
  get(): Promise<CompanySettings>;
  update(patch: CompanySettingsPatch): Promise<CompanySettings>;
  /** Crea la fila id = 1 con los valores por defecto; devuelve false si ya existía. */
  createIfMissing(): Promise<boolean>;
}
