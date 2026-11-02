import { describe, expect, it } from 'vitest';
import {
  commercialParametersSchema,
  EXPIRING_ALERT_DAYS_LT_VALIDITY,
  updateCompanyProfileSchema,
  updateCommercialParametersSchema,
} from './company-settings.schema.js';
import { percentString } from './decimal.schema.js';

const DEFAULTS = {
  defaultVatRate: 'GENERAL_19',
  validityDays: 15,
  discountLimitSeller: '10',
  discountLimitManager: '30',
  discountLimitAdmin: '30',
  shippingTaxable: false,
  expiringAlertDays: 3,
  followUpDays: 5,
  coldStartThreshold: 30,
} as const;

describe('percentString', () => {
  it('accepts 0–100 with up to 2 decimals', () => {
    for (const value of ['0', '10', '12.5', '99.99', '100', '100.00']) {
      expect(percentString.safeParse(value).success, value).toBe(true);
    }
  });

  it('rejects out of range, extra decimals, commas and signs', () => {
    for (const value of ['100.01', '101', '1.234', '10,5', '-1', '', 'abc', '1e2']) {
      expect(percentString.safeParse(value).success, value).toBe(false);
    }
  });
});

describe('commercialParametersSchema', () => {
  it('accepts the seed defaults', () => {
    expect(commercialParametersSchema.parse(DEFAULTS)).toEqual(DEFAULTS);
  });

  it('requires X < N with the issue on expiringAlertDays', () => {
    const result = commercialParametersSchema.safeParse({ ...DEFAULTS, validityDays: 3 });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['expiringAlertDays'],
        code: 'custom',
        message: EXPIRING_ALERT_DAYS_LT_VALIDITY,
      }),
    ]);
  });

  it('enforces ranges and integers', () => {
    const invalid = [
      { validityDays: 0 },
      { validityDays: 366 },
      { expiringAlertDays: 0 },
      { followUpDays: 91 },
      { coldStartThreshold: 29 },
      { coldStartThreshold: 51 },
      { followUpDays: 2.5 },
      { discountLimitSeller: '101' },
      { defaultVatRate: 'GENERAL_16' },
    ];
    for (const patch of invalid) {
      expect(commercialParametersSchema.safeParse({ ...DEFAULTS, ...patch }).success).toBe(false);
    }
  });

  it('allows a partial update payload', () => {
    expect(updateCommercialParametersSchema.parse({ followUpDays: 7 })).toEqual({
      followUpDays: 7,
    });
  });
});

describe('updateCompanyProfileSchema', () => {
  it('trims, turns empty strings into null and normalizes the email', () => {
    expect(
      updateCompanyProfileSchema.parse({ name: '  Acme  ', taxId: '', email: ' INFO@Acme.co ' }),
    ).toEqual({ name: 'Acme', taxId: null, email: 'info@acme.co' });
  });

  it('validates email format and lengths', () => {
    expect(updateCompanyProfileSchema.safeParse({ email: 'no-es-correo' }).success).toBe(false);
    expect(updateCompanyProfileSchema.safeParse({ name: 'x'.repeat(151) }).success).toBe(false);
    expect(updateCompanyProfileSchema.safeParse({ documentLocale: 'fr' }).success).toBe(false);
    expect(updateCompanyProfileSchema.safeParse({ city: 'x'.repeat(101) }).success).toBe(false);
    expect(updateCompanyProfileSchema.safeParse({ bankAccounts: 'x'.repeat(1001) }).success).toBe(
      false,
    );
  });
});
