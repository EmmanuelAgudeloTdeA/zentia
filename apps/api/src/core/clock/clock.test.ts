import { afterEach, describe, expect, it, vi } from 'vitest';
import { SystemClock } from './clock.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('SystemClock', () => {
  it('returns the calendar day in America/Bogota, not in UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T03:00:00.000Z'));
    expect(new SystemClock().today()).toBe('2026-11-03');
    vi.setSystemTime(new Date('2026-11-04T05:00:00.000Z'));
    expect(new SystemClock().today()).toBe('2026-11-04');
  });
});
