import { ERROR_CODES } from '@zentia/shared';
import { describe, expect, it } from 'vitest';
import type { ClientErrorCode } from '../core/http-client';
import en from './en.json';
import es from './es.json';

const CLIENT_CODES: readonly ClientErrorCode[] = ['UNKNOWN', 'NETWORK_ERROR'];

describe('error code translations', () => {
  it.each([
    ['es', es.errors],
    ['en', en.errors],
  ])('%s translates every API and client error code', (_locale, errors) => {
    const missing = [...ERROR_CODES, ...CLIENT_CODES].filter(
      (code) => typeof (errors as Record<string, unknown>)[code] !== 'string',
    );
    expect(missing).toEqual([]);
  });
});
