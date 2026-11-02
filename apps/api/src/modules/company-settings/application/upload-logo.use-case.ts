import type { LogoUploadResult, UploadLogoRequest } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import { toLogoDataUrl, validateLogo } from '../domain/index.js';
import type { CompanySettingsRepository, ImageInspector } from './ports/index.js';

export class UploadLogoUseCase {
  constructor(
    private readonly deps: { settings: CompanySettingsRepository; imageInspector: ImageInspector },
  ) {}

  async execute({ mimeType, data }: UploadLogoRequest): Promise<LogoUploadResult> {
    const bytes = Buffer.from(data, 'base64');
    const validation = validateLogo(mimeType, this.deps.imageInspector.detect(bytes), bytes.length);
    if (!validation.ok) {
      throw new AppError(
        validation.reason === 'tooLarge' ? 'LOGO_TOO_LARGE' : 'LOGO_INVALID_TYPE',
        400,
      );
    }
    const base64 = bytes.toString('base64');
    const updated = await this.deps.settings.update({
      logoDataUrl: toLogoDataUrl({ mimeType: validation.mimeType, base64 }),
      bumpLogoVersion: true,
    });
    return { hasLogo: true, logoVersion: updated.logoVersion };
  }
}
