import { describe, expect, it } from 'vitest';
import {
  daysBetweenDays,
  followUpReferenceDate,
  isExpiringSoon,
  isWithoutFollowUp,
} from './follow-up.js';

describe('follow-up rules', () => {
  it('uses the latest of the last interaction and the last send', () => {
    expect(followUpReferenceDate(null, '2026-11-01')).toBe('2026-11-01');
    expect(followUpReferenceDate('2026-11-03', '2026-11-01')).toBe('2026-11-03');
    expect(followUpReferenceDate('2026-10-20', '2026-11-01')).toBe('2026-11-01');
  });

  it('flags a quote without follow-up from exactly Y days', () => {
    expect(isWithoutFollowUp('2026-10-29', '2026-11-02', 5)).toBe(false);
    expect(isWithoutFollowUp('2026-10-29', '2026-11-03', 5)).toBe(true);
  });

  it('flags quotes expiring within X days, including the expiry day', () => {
    expect(isExpiringSoon('2026-11-06', '2026-11-02', 3)).toBe(false);
    expect(isExpiringSoon('2026-11-06', '2026-11-03', 3)).toBe(true);
    expect(isExpiringSoon('2026-11-06', '2026-11-06', 3)).toBe(true);
    expect(isExpiringSoon('2026-11-06', '2026-11-07', 3)).toBe(false);
    expect(daysBetweenDays('2026-10-29', '2026-11-03')).toBe(5);
  });
});
