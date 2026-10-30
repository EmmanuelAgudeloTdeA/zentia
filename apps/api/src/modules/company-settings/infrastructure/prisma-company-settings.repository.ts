import { Prisma, type CompanySettings as CompanySettingsRow } from '@prisma/client';
import type { CompanySettingsPatch, CompanySettingsRepository } from '../application/index.js';
import type { CompanySettings } from '../domain/index.js';

const SETTINGS_ID = 1;

function toSettings(row: CompanySettingsRow): CompanySettings {
  return {
    name: row.name,
    taxId: row.taxId,
    address: row.address,
    phone: row.phone,
    email: row.email,
    commercialTerms: row.commercialTerms,
    documentLocale: row.documentLocale,
    logoDataUrl: row.logoDataUrl,
    logoVersion: row.logoVersion,
    defaultVatRate: row.defaultVatRate,
    validityDays: row.validityDays,
    discountLimitSeller: row.discountLimitSeller.toString(),
    discountLimitManager: row.discountLimitManager.toString(),
    discountLimitAdmin: row.discountLimitAdmin.toString(),
    shippingTaxable: row.shippingTaxable,
    expiringAlertDays: row.expiringAlertDays,
    followUpDays: row.followUpDays,
    coldStartThreshold: row.coldStartThreshold,
    updatedAt: row.updatedAt,
  };
}

function toUpdateData({
  bumpLogoVersion,
  discountLimitSeller,
  discountLimitManager,
  discountLimitAdmin,
  ...rest
}: CompanySettingsPatch): Prisma.CompanySettingsUpdateInput {
  return {
    ...rest,
    ...(discountLimitSeller !== undefined
      ? { discountLimitSeller: new Prisma.Decimal(discountLimitSeller) }
      : {}),
    ...(discountLimitManager !== undefined
      ? { discountLimitManager: new Prisma.Decimal(discountLimitManager) }
      : {}),
    ...(discountLimitAdmin !== undefined
      ? { discountLimitAdmin: new Prisma.Decimal(discountLimitAdmin) }
      : {}),
    ...(bumpLogoVersion ? { logoVersion: { increment: 1 } } : {}),
  };
}

export class PrismaCompanySettingsRepository implements CompanySettingsRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async get(): Promise<CompanySettings> {
    const row = await this.db.companySettings.findUnique({ where: { id: SETTINGS_ID } });
    if (row) return toSettings(row);
    await this.createIfMissing();
    return toSettings(
      await this.db.companySettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } }),
    );
  }

  async update(patch: CompanySettingsPatch): Promise<CompanySettings> {
    await this.createIfMissing();
    const row = await this.db.companySettings.update({
      where: { id: SETTINGS_ID },
      data: toUpdateData(patch),
    });
    return toSettings(row);
  }

  async createIfMissing(): Promise<boolean> {
    const { count } = await this.db.companySettings.createMany({
      data: [{ id: SETTINGS_ID }],
      skipDuplicates: true,
    });
    return count === 1;
  }
}
