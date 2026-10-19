import { z } from 'zod';

export const PASSWORD_MIN_BYTES = 10;
export const PASSWORD_MAX_BYTES = 72;

export type PasswordRule = 'length' | 'letterAndNumber' | 'notEmail';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    bytes += codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** Devuelve las reglas de la política que la contraseña incumple (vacío si cumple). */
export function checkPasswordPolicy(password: string, email?: string): PasswordRule[] {
  const failed: PasswordRule[] = [];
  const bytes = utf8ByteLength(password);
  if (bytes < PASSWORD_MIN_BYTES || bytes > PASSWORD_MAX_BYTES) failed.push('length');
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) failed.push('letterAndNumber');
  if (email !== undefined && normalizeEmail(password) === normalizeEmail(email)) {
    failed.push('notEmail');
  }
  return failed;
}

export const passwordSchema = z.string().superRefine((value, ctx) => {
  for (const rule of checkPasswordPolicy(value)) {
    ctx.addIssue({ code: 'custom', message: `password.${rule}`, params: { rule } });
  }
});
