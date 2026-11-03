import { describe, expect, it } from 'vitest';
import { moneyString } from './decimal.schema.js';
import { createProductRequestSchema, listProductsQuerySchema } from './products.schema.js';

const base = { name: 'Portátil', category: '  Tecnología   Móvil ', vatRate: 'GENERAL_19' };

describe('createProductRequestSchema', () => {
  it('normalizes the category label and keeps the price as string', () => {
    expect(createProductRequestSchema.parse({ ...base, price: '1550000' })).toEqual({
      ...base,
      category: 'Tecnología Móvil',
      price: '1550000',
    });
  });

  it.each(['0', '-1', '12.5', '0100', '1234567890123456', 'abc'])('rejects price %s', (price) => {
    expect(createProductRequestSchema.safeParse({ ...base, price }).success).toBe(false);
  });

  it('rejects an unknown VAT rate', () => {
    expect(
      createProductRequestSchema.safeParse({ ...base, price: '1', vatRate: 'GENERAL_16' }).success,
    ).toBe(false);
  });
});

describe('moneyString and product queries', () => {
  it('accepts zero as money but only canonical integers', () => {
    expect(moneyString.safeParse('0').success).toBe(true);
    expect(moneyString.safeParse('007').success).toBe(false);
  });

  it('parses list filters', () => {
    expect(listProductsQuerySchema.parse({ status: 'all', category: 'Tecnología' })).toEqual({
      status: 'all',
      category: 'Tecnología',
      page: 1,
      pageSize: 20,
    });
  });
});
