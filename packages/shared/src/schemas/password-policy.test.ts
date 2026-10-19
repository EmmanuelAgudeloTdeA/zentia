import { describe, expect, it } from 'vitest';
import { changePasswordRequestSchema, loginRequestSchema } from './auth.schema.js';
import { checkPasswordPolicy, passwordSchema } from './password-policy.js';

describe('checkPasswordPolicy', () => {
  it('accepts a password with 10+ bytes, a letter and a number', () => {
    expect(checkPasswordPolicy('ventas2026x')).toEqual([]);
  });

  it('measures length in UTF-8 bytes', () => {
    expect(checkPasswordPolicy('ñandú12')).toContain('length');
    expect(checkPasswordPolicy('ñandú1234')).toEqual([]);
    expect(checkPasswordPolicy(`a1${'é'.repeat(35)}`)).toEqual([]);
    expect(checkPasswordPolicy(`a1${'é'.repeat(36)}`)).toContain('length');
  });

  it('requires at least one letter and one number', () => {
    expect(checkPasswordPolicy('soloLetrasAqui')).toEqual(['letterAndNumber']);
    expect(checkPasswordPolicy('1234567890')).toEqual(['letterAndNumber']);
  });

  it('rejects a password equal to the email, ignoring case and spaces', () => {
    expect(checkPasswordPolicy('Ana1@empresa.co', ' ana1@EMPRESA.co ')).toEqual(['notEmail']);
  });

  it('exposes the failed rule in the schema issue', () => {
    const result = passwordSchema.safeParse('corta1');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('custom');
  });
});

describe('auth schemas', () => {
  it('normalizes the login email', () => {
    expect(loginRequestSchema.parse({ email: ' Ana@Empresa.CO ', password: 'x' }).email).toBe(
      'ana@empresa.co',
    );
  });

  it('validates the new password with the policy', () => {
    expect(
      changePasswordRequestSchema.safeParse({ currentPassword: 'x', newPassword: 'corta' }).success,
    ).toBe(false);
  });
});
