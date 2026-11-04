import { describe, expect, it } from 'vitest';
import { bogotaRangeUtc, periodPresets, resolvePeriod } from './dashboard.js';

describe('dashboard period', () => {
  it('builds the presets, including the previous month in January', () => {
    expect(periodPresets('2026-11-03')).toEqual({
      thisMonth: { from: '2026-11-01', to: '2026-11-30' },
      lastMonth: { from: '2026-10-01', to: '2026-10-31' },
      last90Days: { from: '2026-08-06', to: '2026-11-03' },
    });
    expect(periodPresets('2026-01-15').lastMonth).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(periodPresets('2028-02-10').thisMonth.to).toBe('2028-02-29');
  });

  it('defaults to the current month and rejects invalid ranges', () => {
    expect(resolvePeriod(undefined, undefined, '2026-11-03')).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
    expect(resolvePeriod('2026-11-10', '2026-11-01', '2026-11-03')).toBeNull();
    expect(resolvePeriod('2025-11-03', '2026-11-03', '2026-11-03')).toEqual({
      from: '2025-11-03',
      to: '2026-11-03',
    });
    expect(resolvePeriod('2025-11-02', '2026-11-03', '2026-11-03')).toBeNull();
  });

  it('maps Bogota days to UTC bounds [from 05:00Z, to+1 05:00Z)', () => {
    expect(bogotaRangeUtc('2026-10-01', '2026-10-31')).toEqual({
      fromUtc: new Date('2026-10-01T05:00:00.000Z'),
      toUtcExclusive: new Date('2026-11-01T05:00:00.000Z'),
    });
    expect(bogotaRangeUtc(undefined, '2026-12-31')).toEqual({
      toUtcExclusive: new Date('2027-01-01T05:00:00.000Z'),
    });
    expect(bogotaRangeUtc(undefined, undefined)).toEqual({});
  });
});
