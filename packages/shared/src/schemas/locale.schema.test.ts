import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE } from '../enums/index.js';
import { localeSchema } from './locale.schema.js';

describe('localeSchema', () => {
  it('accepts the supported locales', () => {
    expect(localeSchema.parse('es')).toBe('es');
    expect(localeSchema.parse('en')).toBe('en');
  });

  it('rejects unsupported locales', () => {
    expect(localeSchema.safeParse('fr').success).toBe(false);
  });

  it('defaults to Spanish', () => {
    expect(DEFAULT_LOCALE).toBe('es');
  });
});
