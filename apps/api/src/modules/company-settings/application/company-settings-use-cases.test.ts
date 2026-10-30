import { describe, expect, it } from 'vitest';
import {
  createInMemoryCompanySettings,
  InMemoryCompanySettingsRepository,
} from '../../../test/in-memory-company-settings.js';
import { CompanySettingsReader } from './settings-reader.js';
import { SeedCompanySettingsUseCase } from './seed-company-settings.use-case.js';
import { UploadLogoUseCase } from './upload-logo.use-case.js';

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function png(size: number): string {
  const bytes = Buffer.alloc(size, 0);
  Buffer.from(PNG_HEADER).copy(bytes);
  return bytes.toString('base64');
}

describe('UploadLogoUseCase', () => {
  const setup = () => {
    const infrastructure = createInMemoryCompanySettings();
    return { settings: infrastructure.settings, upload: new UploadLogoUseCase(infrastructure) };
  };

  it('stores a data URL and increments logoVersion on each upload', async () => {
    const { settings, upload } = setup();
    await expect(upload.execute({ mimeType: 'image/png', data: png(64) })).resolves.toEqual({
      hasLogo: true,
      logoVersion: 1,
    });
    await expect(upload.execute({ mimeType: 'image/png', data: png(64) })).resolves.toEqual({
      hasLogo: true,
      logoVersion: 2,
    });
    expect((await settings.get()).logoDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('rejects images over 512 KB decoded', async () => {
    const { settings, upload } = setup();
    await expect(
      upload.execute({ mimeType: 'image/png', data: png(512 * 1024 + 1) }),
    ).rejects.toMatchObject({ code: 'LOGO_TOO_LARGE', status: 400 });
    expect((await settings.get()).logoVersion).toBe(0);
  });
});

describe('CompanySettingsReader', () => {
  it('returns read-only DTOs that reflect changes on the next read', async () => {
    const settings = new InMemoryCompanySettingsRepository();
    const reader = new CompanySettingsReader({ settings });

    const before = await reader.getCommercialParameters();
    expect(before.discountLimits.SELLER.toString()).toBe('10');
    expect(before.discountLimits.ADMIN.equals(30)).toBe(true);
    expect(Object.isFrozen(before)).toBe(true);
    expect(Object.isFrozen(before.discountLimits)).toBe(true);

    await settings.update({ discountLimitSeller: '12.5', validityDays: 20 });
    const after = await reader.getCommercialParameters();
    expect(after.discountLimits.SELLER.toString()).toBe('12.5');
    expect(after.validityDays).toBe(20);
  });

  it('includes the logo data URL only in the document profile', async () => {
    const settings = new InMemoryCompanySettingsRepository();
    await settings.update({ name: 'Acme', logoDataUrl: 'data:image/png;base64,AAAA' });
    const profile = await new CompanySettingsReader({ settings }).getDocumentProfile();
    expect(profile).toEqual({
      name: 'Acme',
      taxId: null,
      address: null,
      city: null,
      phone: null,
      email: null,
      website: null,
      bankAccounts: null,
      commercialTerms: null,
      documentLocale: 'es',
      logoDataUrl: 'data:image/png;base64,AAAA',
    });
  });
});

describe('SeedCompanySettingsUseCase', () => {
  it('creates the row once and leaves an existing one untouched', async () => {
    const settings = new InMemoryCompanySettingsRepository();
    const seed = new SeedCompanySettingsUseCase({ settings });
    await expect(seed.execute()).resolves.toBe('created');
    await settings.update({ name: 'Acme' });
    await expect(seed.execute()).resolves.toBe('exists');
    expect((await settings.get()).name).toBe('Acme');
  });
});
