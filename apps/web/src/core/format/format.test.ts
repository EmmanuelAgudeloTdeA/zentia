import { describe, expect, it } from 'vitest';
import { formatCop, formatDate, groupThousands } from './format';

describe('format', () => {
  it('formats COP without decimals and keeps 15-digit precision', () => {
    expect(formatCop('1550000').replace(/\s/g, ' ')).toBe('$ 1.550.000');
    expect(formatCop('999999999999999')).toContain('999.999.999.999.999');
  });

  it('groups thousands and formats dates in Bogotá', () => {
    expect(groupThousands('1550000')).toBe('1.550.000');
    expect(groupThousands('999')).toBe('999');
    expect(formatDate('2026-11-03T03:00:00.000Z')).toBe('02/11/2026');
  });
});

describe('date helpers', () => {
  it('formats days without timezone shifts and computes Bogotá today', async () => {
    const { daysBetween, formatDateTime, formatDay, formatPercent, todayInBogota } =
      await import('./format');
    expect(formatDay('2026-11-18')).toBe('18/11/2026');
    expect(todayInBogota(new Date('2026-11-04T03:00:00.000Z'))).toBe('2026-11-03');
    expect(daysBetween('2026-11-03', '2026-11-06')).toBe(3);
    expect(formatDateTime('2026-11-03T20:05:00.000Z')).toBe('03/11/2026 15:05');
    expect(formatPercent('7.5')).toBe('7,5 %');
  });
});
