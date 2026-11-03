import { describe, expect, it } from 'vitest';
import {
  formatPhoneForDisplay,
  normalizeCategoryLabel,
  normalizeDocumentId,
  normalizePhone,
  toSearchKey,
} from './normalize.js';

describe('normalizeDocumentId', () => {
  it.each([
    ['900.123.456-7', '9001234567'],
    [' 1.036.123.456 ', '1036123456'],
    ['ce-ab 12345', 'CEAB12345'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeDocumentId(input)).toBe(expected);
  });
});

describe('normalizePhone', () => {
  it.each([
    ['300 123 4567', '573001234567'],
    ['+57 (300) 123-4567', '573001234567'],
    ['1 305 555 0100', '13055550100'],
    ['604 1234', null],
    ['1234567890123456', null],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe('formatPhoneForDisplay', () => {
  it('groups Colombian numbers and prefixes others with +', () => {
    expect(formatPhoneForDisplay('573001234567')).toBe('+57 300 123 4567');
    expect(formatPhoneForDisplay('13055550100')).toBe('+13055550100');
  });
});

describe('toSearchKey and normalizeCategoryLabel', () => {
  it('removes accents, lowercases and collapses spaces', () => {
    expect(toSearchKey('  Tecnología   Móvil ')).toBe('tecnologia movil');
    expect(toSearchKey('JOSÉ Ñandú')).toBe('jose nandu');
  });

  it('keeps the written form of a category', () => {
    expect(normalizeCategoryLabel('  Tecnología   Móvil ')).toBe('Tecnología Móvil');
  });
});
