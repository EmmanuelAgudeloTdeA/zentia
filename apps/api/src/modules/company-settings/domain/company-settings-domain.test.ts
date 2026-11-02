import { ZodError } from 'zod';
import { describe, expect, it } from 'vitest';
import { commercialParametersOf, mergeCommercialParameters } from './commercial-parameters.js';
import { DEFAULT_COMPANY_SETTINGS } from './company-settings.js';
import { parseLogoDataUrl, toLogoDataUrl, validateLogo } from './logo.js';

const current = commercialParametersOf({ ...DEFAULT_COMPANY_SETTINGS, updatedAt: new Date() });

describe('mergeCommercialParameters', () => {
  it('applies only the sent fields', () => {
    expect(mergeCommercialParameters(current, { followUpDays: 8 })).toEqual({
      ...current,
      followUpDays: 8,
    });
  });

  it('validates X < N over the combined result, not only the patch', () => {
    expect(() => mergeCommercialParameters(current, { validityDays: 3 })).toThrow(ZodError);
    try {
      mergeCommercialParameters(current, { validityDays: 3 });
    } catch (error) {
      expect((error as ZodError).issues[0]?.path).toEqual(['expiringAlertDays']);
    }
    expect(mergeCommercialParameters(current, { validityDays: 4 }).validityDays).toBe(4);
    expect(() => mergeCommercialParameters(current, { expiringAlertDays: 15 })).toThrow(ZodError);
  });

  it('accepts raising X and N together', () => {
    expect(
      mergeCommercialParameters(current, { validityDays: 30, expiringAlertDays: 10 }),
    ).toMatchObject({ validityDays: 30, expiringAlertDays: 10 });
  });
});

describe('logo rules', () => {
  it('requires a supported type whose signature matches', () => {
    expect(validateLogo('image/png', 'image/png', 10)).toEqual({ ok: true, mimeType: 'image/png' });
    expect(validateLogo('image/png', 'image/jpeg', 10)).toEqual({
      ok: false,
      reason: 'invalidType',
    });
    expect(validateLogo('image/gif', null, 10)).toEqual({ ok: false, reason: 'invalidType' });
  });

  it('rejects images over 512 KB', () => {
    expect(validateLogo('image/jpeg', 'image/jpeg', 512 * 1024).ok).toBe(true);
    expect(validateLogo('image/jpeg', 'image/jpeg', 512 * 1024 + 1)).toEqual({
      ok: false,
      reason: 'tooLarge',
    });
  });

  it('round-trips the data URL', () => {
    const dataUrl = toLogoDataUrl({ mimeType: 'image/png', base64: 'iVBORw0KGgo=' });
    expect(dataUrl).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(parseLogoDataUrl(dataUrl)).toEqual({ mimeType: 'image/png', base64: 'iVBORw0KGgo=' });
    expect(parseLogoDataUrl('data:image/gif;base64,AAAA')).toBeNull();
  });
});
