import { describe, expect, it } from 'vitest';
import { alertsFor } from './alert-rules.js';
import type { AlertCandidate } from './follow-up.js';

const candidate = (overrides: Partial<AlertCandidate> = {}): AlertCandidate => ({
  quoteId: 'q1',
  ownerId: 'u1',
  number: 12,
  customerName: 'Acme',
  expiresAt: '2026-11-20',
  sentDay: '2026-11-01',
  lastInteractionDay: null,
  ...overrides,
});

const params = { expiringAlertDays: 3, followUpDays: 5 };

describe('alertsFor', () => {
  it('creates the expiring alert inside the X-day window', () => {
    const quote = candidate({ expiresAt: '2026-11-06', sentDay: '2026-11-03' });
    expect(alertsFor([quote], '2026-11-02', params)).toEqual([]);
    expect(alertsFor([quote], '2026-11-03', params)).toEqual([
      {
        userId: 'u1',
        quoteId: 'q1',
        type: 'QUOTE_EXPIRING',
        referenceDate: '2026-11-06',
        params: {
          quoteId: 'q1',
          quoteNumber: 'COT-0012',
          customerName: 'Acme',
          expiresAt: '2026-11-06',
        },
      },
    ]);
  });

  it('creates the no follow-up alert from the latest contact', () => {
    expect(alertsFor([candidate()], '2026-11-06', params)).toMatchObject([
      { type: 'QUOTE_NO_FOLLOW_UP', referenceDate: '2026-11-01', params: { days: 5 } },
    ]);
    expect(
      alertsFor([candidate({ lastInteractionDay: '2026-11-03' })], '2026-11-06', params),
    ).toEqual([]);
    expect(
      alertsFor([candidate({ lastInteractionDay: '2026-11-03' })], '2026-11-08', params),
    ).toMatchObject([
      { type: 'QUOTE_NO_FOLLOW_UP', referenceDate: '2026-11-03', params: { days: 5 } },
    ]);
  });
});
