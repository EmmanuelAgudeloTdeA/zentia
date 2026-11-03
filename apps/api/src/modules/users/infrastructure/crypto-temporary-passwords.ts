import { randomInt } from 'node:crypto';
import { checkPasswordPolicy } from '@zentia/shared';
import type { TemporaryPasswordGenerator } from '../application/index.js';

const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHABET = LETTERS + DIGITS;
const LENGTH = 12;

function pick(chars: string): string {
  return chars.charAt(randomInt(chars.length));
}

export class CryptoTemporaryPasswords implements TemporaryPasswordGenerator {
  generate(): string {
    for (;;) {
      const chars = [pick(LETTERS), pick(DIGITS)];
      while (chars.length < LENGTH) chars.push(pick(ALPHABET));
      for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j] ?? '', chars[i] ?? ''];
      }
      const password = chars.join('');
      if (checkPasswordPolicy(password).length === 0) return password;
    }
  }
}
