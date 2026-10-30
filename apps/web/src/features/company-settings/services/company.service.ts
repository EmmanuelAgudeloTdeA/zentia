import type {
  BrandingDto,
  CompanySettingsDto,
  LogoUploadResult,
  UpdateCommercialParametersRequest,
  UpdateCompanyProfileRequest,
  UploadLogoRequest,
} from '@zentia/shared';
import { request } from '../../../core/http-client';

export const companyService = {
  getBranding: () => request<BrandingDto>('GET', '/company/branding', { skipAuth: true }),
  getSettings: () => request<CompanySettingsDto>('GET', '/company/settings'),
  updateProfile: (body: UpdateCompanyProfileRequest) =>
    request<CompanySettingsDto>('PATCH', '/company/profile', { body }),
  updateParameters: (body: UpdateCommercialParametersRequest) =>
    request<CompanySettingsDto>('PATCH', '/company/parameters', { body }),
  uploadLogo: (body: UploadLogoRequest) =>
    request<LogoUploadResult>('PUT', '/company/logo', { body }),
  deleteLogo: () => request<undefined>('DELETE', '/company/logo'),
};
