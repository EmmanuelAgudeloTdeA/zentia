import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SeedCompanySettingsUseCase } from '../application/index.js';
import { PrismaCompanySettingsRepository } from './prisma-company-settings.repository.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaCompanySettingsRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaCompanySettingsRepository;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
    repository = new PrismaCompanySettingsRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.companySettings.deleteMany();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('seeds the defaults once and never overwrites an existing row', async () => {
    const seed = new SeedCompanySettingsUseCase({ settings: repository });
    await expect(seed.execute()).resolves.toBe('created');
    expect(await repository.get()).toMatchObject({
      name: null,
      documentLocale: 'es',
      defaultVatRate: 'GENERAL_19',
      validityDays: 15,
      discountLimitSeller: '10',
      discountLimitManager: '30',
      discountLimitAdmin: '30',
      shippingTaxable: false,
      expiringAlertDays: 3,
      followUpDays: 5,
      coldStartThreshold: 30,
      logoVersion: 0,
    });

    await repository.update({ name: 'Acme SAS', validityDays: 20 });
    await expect(seed.execute()).resolves.toBe('exists');
    expect(await repository.get()).toMatchObject({ name: 'Acme SAS', validityDays: 20 });
  });

  it('rejects a second row', async () => {
    await repository.createIfMissing();
    await expect(prisma.companySettings.create({ data: { id: 2 } })).rejects.toThrow();
  });

  it('enforces the range CHECKs in the database', async () => {
    await repository.createIfMissing();
    await expect(repository.update({ validityDays: 3 })).rejects.toThrow();
    await expect(repository.update({ followUpDays: 91 })).rejects.toThrow();
    await expect(repository.update({ coldStartThreshold: 51 })).rejects.toThrow();
    await expect(repository.update({ discountLimitSeller: '100.01' })).rejects.toThrow();
  });

  it('maps decimals as strings and bumps the logo version atomically', async () => {
    const updated = await repository.update({ discountLimitSeller: '12.5' });
    expect(updated.discountLimitSeller).toBe('12.5');

    const withLogo = await repository.update({
      logoDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      bumpLogoVersion: true,
    });
    expect(withLogo.logoVersion).toBe(1);
  });
});
