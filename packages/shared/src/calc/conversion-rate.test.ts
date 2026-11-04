import { describe, expect, it } from 'vitest';
import { conversionRate } from './conversion-rate.js';

describe('conversionRate', () => {
  it('rounds half-up to 2 decimals and returns null without closed quotes', () => {
    expect(conversionRate(3, 5, 0)).toBe('37.50');
    expect(conversionRate(1, 2, 0)).toBe('33.33');
    expect(conversionRate(2, 1, 0)).toBe('66.67');
    expect(conversionRate(0, 0, 0)).toBeNull();
    expect(conversionRate(4, 0, 0)).toBe('100.00');
  });
});
