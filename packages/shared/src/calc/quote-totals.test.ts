import { describe, expect, it } from 'vitest';
import {
  calculateQuoteTotals,
  quoteTotalsToStrings,
  type QuoteTotalsInput,
} from './quote-totals.js';

const PPI: QuoteTotalsInput = {
  items: [{ unitPrice: '2500000', quantity: '2', vatRate: 'GENERAL_19' }],
  discountPct: '10',
  shippingAmount: '20000',
  shippingTaxable: false,
};

function totals(input: QuoteTotalsInput) {
  return quoteTotalsToStrings(calculateQuoteTotals(input));
}

describe('calculateQuoteTotals', () => {
  it('matches the PPI example (5.375.000)', () => {
    expect(totals(PPI)).toEqual({
      lineAmounts: ['5000000'],
      subtotal: '5000000',
      discountAmount: '500000',
      linesVat: '855000',
      shippingVat: '0',
      total: '5375000',
    });
  });

  it('adds 19 % VAT to taxable shipping (5.378.800)', () => {
    expect(totals({ ...PPI, shippingTaxable: true })).toMatchObject({
      shippingVat: '3800',
      total: '5378800',
    });
  });

  it('rounds each concept half-up independently', () => {
    const result = totals({
      items: [{ unitPrice: '33333', quantity: '1.5', vatRate: 'GENERAL_19' }],
      discountPct: '7.5',
      shippingAmount: '0',
      shippingTaxable: false,
    });
    // 49.999,5 → 50.000; descuento 3.750; IVA 0,925 × 50.000 × 0,19 = 8.787,5 → 8.788
    expect(result).toMatchObject({
      lineAmounts: ['50000'],
      discountAmount: '3750',
      linesVat: '8788',
      total: '55038',
    });
  });

  it('does not round VAT per line', () => {
    const result = totals({
      items: [
        { unitPrice: '13', quantity: '1', vatRate: 'REDUCED_5' },
        { unitPrice: '13', quantity: '1', vatRate: 'REDUCED_5' },
      ],
      discountPct: '0',
      shippingAmount: '0',
      shippingTaxable: false,
    });
    // 0,65 + 0,65 = 1,3 → 1 (redondeando por línea daría 2)
    expect(result.linesVat).toBe('1');
  });

  it('handles exempt lines and 0 % / 100 % discounts', () => {
    const exempt = { unitPrice: '100000', quantity: '3', vatRate: 'EXEMPT' } as const;
    expect(
      totals({ items: [exempt], discountPct: '0', shippingAmount: '0', shippingTaxable: true }),
    ).toMatchObject({ linesVat: '0', shippingVat: '0', total: '300000' });
    expect(
      totals({
        items: [{ unitPrice: '100000', quantity: '1', vatRate: 'GENERAL_19' }],
        discountPct: '100',
        shippingAmount: '10000',
        shippingTaxable: true,
      }),
    ).toMatchObject({
      discountAmount: '100000',
      linesVat: '0',
      shippingVat: '1900',
      total: '11900',
    });
  });

  it('returns zeros for an empty quote', () => {
    expect(
      totals({ items: [], discountPct: '', shippingAmount: '', shippingTaxable: false }).total,
    ).toBe('0');
  });
});
