import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import {
  CompanySettingsReader,
  DeleteLogoUseCase,
  GetBrandingUseCase,
  GetLogoUseCase,
  GetSettingsUseCase,
  UpdateParametersUseCase,
  UpdateProfileUseCase,
  UploadLogoUseCase,
  type CompanySettingsInfrastructure,
  type SettingsReader,
} from './application/index.js';
import {
  createCompanyBodyParsers,
  createCompanyOpenApi,
  createCompanyRouter,
} from './presentation/index.js';

export {
  SeedCompanySettingsUseCase,
  type CommercialParametersDto,
  type CompanySettingsInfrastructure,
  type DocumentProfileDto,
  type SettingsReader,
} from './application/index.js';
export { createPrismaCompanySettingsInfrastructure } from './infrastructure/index.js';

export interface CompanySettingsModuleOptions extends ModuleDependencies {
  infrastructure: CompanySettingsInfrastructure;
}

export interface CompanySettingsModule {
  module: ModuleDefinition;
  settingsReader: SettingsReader;
}

export function createCompanySettingsModule({
  infrastructure,
  publicLimiter,
  requireAuth,
}: CompanySettingsModuleOptions): CompanySettingsModule {
  return {
    settingsReader: new CompanySettingsReader(infrastructure),
    module: {
      name: 'company-settings',
      basePath: '/company',
      bodyParsers: createCompanyBodyParsers(),
      router: createCompanyRouter({
        getBranding: new GetBrandingUseCase(infrastructure),
        getLogo: new GetLogoUseCase(infrastructure),
        getSettings: new GetSettingsUseCase(infrastructure),
        updateProfile: new UpdateProfileUseCase(infrastructure),
        updateParameters: new UpdateParametersUseCase(infrastructure),
        uploadLogo: new UploadLogoUseCase(infrastructure),
        deleteLogo: new DeleteLogoUseCase(infrastructure),
        publicLimiter,
        requireAuth,
      }),
      openapi: createCompanyOpenApi(),
    },
  };
}
