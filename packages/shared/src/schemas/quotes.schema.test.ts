import { describe, expect, it } from 'vitest';
import { formatQuoteNumber } from '../enums/index.js';
import { quantityString } from './decimal.schema.js';
import { createQuoteRequestSchema, listQuotesQuerySchema } from './quotes.schema.js';

const productId = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d';

describe('quotes schemas', () => {
  it('formats quote numbers with at least 4 digits', () => {
    expect(formatQuoteNumber(1)).toBe('COT-0001');
    expect(formatQuoteNumber(12345)).toBe('COT-12345');
  });

  it.each(['1', '1.5', '0.01', '9999999999.99'])('accepts quantity %s', (value) => {
    expect(quantityString.safeParse(value).success).toBe(true);
  });

  it.each(['0', '0.00', '-1', '1.555', '1,5', ''])('rejects quantity %s', (value) => {
    expect(quantityString.safeParse(value).success).toBe(false);
  });

  it('defaults discount and shipping and limits lines to 1–100', () => {
    const base = { customerId: productId, items: [{ productId, quantity: '2' }] };
    expect(createQuoteRequestSchema.parse(base)).toMatchObject({
      discountPct: '0',
      shippingAmount: '0',
    });
    expect(createQuoteRequestSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    const many = Array.from({ length: 101 }, () => ({ productId, quantity: '1' }));
    expect(createQuoteRequestSchema.safeParse({ ...base, items: many }).success).toBe(false);
  });

  it('parses the status filter as CSV', () => {
    expect(listQuotesQuerySchema.parse({ status: 'DRAFT,SENT' }).status).toEqual(['DRAFT', 'SENT']);
    expect(listQuotesQuerySchema.parse({}).status).toEqual([]);
    expect(listQuotesQuerySchema.safeParse({ status: 'DRAFT,NOPE' }).success).toBe(false);
  });
});
