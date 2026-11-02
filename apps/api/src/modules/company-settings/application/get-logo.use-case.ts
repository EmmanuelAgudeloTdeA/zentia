import type { LogoMimeType } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import { parseLogoDataUrl } from '../domain/index.js';
import type { CompanySettingsRepository } from './ports/index.js';

export interface LogoFile {
  mimeType: LogoMimeType;
  bytes: Buffer;
  version: number;
}

export class GetLogoUseCase {
  constructor(private readonly deps: { settings: CompanySettingsRepository }) {}

  async execute(): Promise<LogoFile> {
    const { logoDataUrl, logoVersion } = await this.deps.settings.get();
    const logo = logoDataUrl ? parseLogoDataUrl(logoDataUrl) : null;
    if (!logo) throw new AppError('LOGO_NOT_FOUND', 404);
    return {
      mimeType: logo.mimeType,
      bytes: Buffer.from(logo.base64, 'base64'),
      version: logoVersion,
    };
  }
}
