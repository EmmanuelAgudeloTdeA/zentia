import type { PrismaClient } from '@prisma/client';
import type { CompanySettingsInfrastructure } from '../application/index.js';
import { PrismaCompanySettingsRepository } from './prisma-company-settings.repository.js';
import { SignatureImageInspector } from './signature-image-inspector.js';

export function createPrismaCompanySettingsInfrastructure(
  prisma: PrismaClient,
): CompanySettingsInfrastructure {
  return {
    settings: new PrismaCompanySettingsRepository(prisma),
    imageInspector: new SignatureImageInspector(),
  };
}
