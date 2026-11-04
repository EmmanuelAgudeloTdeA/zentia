import { describe, expect, it } from 'vitest';
import { calculateProbability, type QuoteSignals } from './probability.js';
import { amountBucket, finalizeMessage, promptCategories } from './prompt.js';

const signals = (overrides: Partial<QuoteSignals> = {}): QuoteSignals => ({
  quoteId: 'q',
  number: 1,
  status: 'SENT',
  ownerId: 'o',
  ownerName: 'Ana',
  customerName: 'Acme',
  total: '100',
  sentDay: '2026-11-01',
  expiresAt: '2026-11-21',
  lastInteractionDay: null,
  interactedSinceSent: false,
  versionsAfterSend: 0,
  ...overrides,
});

const codes = (result: ReturnType<typeof calculateProbability>) =>
  result.factors.map((factor) => factor.code);

describe('calculateProbability', () => {
  it('starts at 40 for a fresh quote', () => {
    expect(calculateProbability(signals(), '2026-11-02', 5)).toEqual({
      probability: 40,
      factors: [{ code: 'BASE', points: 40 }],
    });
  });

  it('adds recent interactions and versions after sending', () => {
    const result = calculateProbability(
      signals({
        lastInteractionDay: '2026-11-05',
        interactedSinceSent: true,
        versionsAfterSend: 1,
      }),
      '2026-11-10',
      5,
    );
    expect(codes(result)).toEqual(['BASE', 'RECENT_INTERACTION', 'VERSION_AFTER_SEND']);
    expect(result.probability).toBe(65);
  });

  it('penalizes more than Y days without follow-up (strictly greater, RN-40)', () => {
    expect(codes(calculateProbability(signals(), '2026-11-06', 5))).toEqual(['BASE']);
    expect(codes(calculateProbability(signals(), '2026-11-07', 5))).toEqual([
      'BASE',
      'NO_FOLLOW_UP',
    ]);
  });

  it('penalizes 75 % of the validity consumed without interaction since sending', () => {
    // vigencia de 20 días desde el 01/11: el 75 % se cumple el 16/11.
    expect(codes(calculateProbability(signals(), '2026-11-15', 30))).toEqual(['BASE']);
    expect(codes(calculateProbability(signals(), '2026-11-16', 30))).toEqual([
      'BASE',
      'VALIDITY_CONSUMED',
    ]);
    expect(
      codes(
        calculateProbability(
          signals({ interactedSinceSent: true, lastInteractionDay: '2026-11-02' }),
          '2026-11-16',
          30,
        ),
      ),
    ).toEqual(['BASE', 'RECENT_INTERACTION']);
  });

  it('clamps the result between 5 and 95', () => {
    const low = calculateProbability(signals(), '2026-11-20', 5);
    expect(low.factors.reduce((sum, factor) => sum + factor.points, 0)).toBe(5);
    expect(low.probability).toBe(5);
  });
});

describe('prompt helpers', () => {
  it.each([
    ['999999', 'LT_1M'],
    ['1000000', '1M_5M'],
    ['4999999', '1M_5M'],
    ['5000000', '5M_20M'],
    ['20000000', '20M_100M'],
    ['99999999', '20M_100M'],
    ['100000000', 'GTE_100M'],
  ])('amount %s → %s', (total, bucket) => {
    expect(amountBucket(total)).toBe(bucket);
  });

  it('keeps up to 5 distinct categories by line amount', () => {
    const items = ['A', 'B', 'A', 'C', 'D', 'E', 'F'].map((category, index) => ({
      category,
      lineAmount: String(100 - index),
    }));
    expect(promptCategories(items)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('replaces the allowed markers, drops any other and trims to 600 characters', () => {
    expect(
      finalizeMessage('Hola {{CLIENTE}} {{NIT}}, saludos. {{ VENDEDOR }}', {
        customer: 'Acme',
        seller: 'Ana',
      }),
    ).toBe('Hola Acme , saludos. Ana');
    expect(finalizeMessage('x'.repeat(700), { customer: 'A', seller: 'B' })).toHaveLength(600);
  });
});
