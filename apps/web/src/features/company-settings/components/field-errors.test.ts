import { commercialParametersSchema } from '@zentia/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/errors';
import es from '../../../lang/es.json';
import { applyServerIssues, fieldErrorKey } from './field-errors';

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    return node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
  }, es);
}

describe('fieldErrorKey', () => {
  it('maps a percent above 100 to too_big instead of the generic message', () => {
    const result = commercialParametersSchema.shape.discountLimitAdmin.safeParse('100.5');
    const issue = result.error?.issues[0];
    expect(issue?.code).toBe('custom');

    const key = fieldErrorKey({ type: issue?.code ?? '', message: issue?.message ?? '' });
    expect(key).toBe('validation.too_big');
  });

  it('falls back to an existing key for unknown issue types', () => {
    expect(fieldErrorKey({ type: 'custom' })).toBe('validation.invalid_value');
    expect(fieldErrorKey({ type: 'too_small' })).toBe('validation.too_small');
  });
});

describe('applyServerIssues', () => {
  it('never produces a key that is missing from lang', () => {
    const setError = vi.fn();
    const error = new ApiError('VALIDATION_ERROR', 400, undefined, [
      { path: 'discountLimitAdmin', code: 'custom' },
      { path: 'coldStartThreshold', code: 'too_big' },
      { path: 'followUpDays', code: 'custom' },
    ]);

    applyServerIssues(
      error,
      setError,
      ['discountLimitAdmin', 'coldStartThreshold', 'followUpDays'],
      { discountLimitAdmin: 'validation.too_big' },
    );

    const keys = setError.mock.calls.map(([, value]) => (value as { message: string }).message);
    expect(keys).toEqual(['validation.too_big', 'validation.too_big', 'validation.invalid_value']);
    for (const key of keys) expect(typeof lookup(key)).toBe('string');
  });
});
