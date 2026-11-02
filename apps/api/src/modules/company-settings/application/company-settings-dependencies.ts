import type { CompanySettingsRepository, ImageInspector } from './ports/index.js';

export interface CompanySettingsInfrastructure {
  settings: CompanySettingsRepository;
  imageInspector: ImageInspector;
}
