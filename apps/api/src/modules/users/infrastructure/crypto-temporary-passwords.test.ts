import { checkPasswordPolicy } from '@zentia/shared';
import { describe, expect, it } from 'vitest';
import { CryptoTemporaryPasswords } from './crypto-temporary-passwords.js';

describe('CryptoTemporaryPasswords', () => {
  it('generates 12 unambiguous characters that meet the password policy', () => {
    const generator = new CryptoTemporaryPasswords();
    const passwords = Array.from({ length: 200 }, () => generator.generate());

    for (const password of passwords) {
      expect(password).toMatch(/^[a-hjkmnp-zA-HJ-NP-Z2-9]{12}$/);
      expect(checkPasswordPolicy(password)).toEqual([]);
    }
    expect(new Set(passwords).size).toBe(passwords.length);
  });
});
