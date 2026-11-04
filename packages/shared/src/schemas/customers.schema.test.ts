import { describe, expect, it } from 'vitest';
import {
  createCustomerRequestSchema,
  documentMatchesQuerySchema,
  listCustomersQuerySchema,
  updateCustomerRequestSchema,
} from './customers.schema.js';

describe('createCustomerRequestSchema', () => {
  it('normalizes the document and email and turns empty contacts into null', () => {
    expect(
      createCustomerRequestSchema.parse({
        name: ' Acme SAS ',
        documentId: '900.123.456-7',
        phone: '',
        email: ' Compras@Acme.CO ',
      }),
    ).toEqual({
      name: 'Acme SAS',
      documentId: '9001234567',
      phone: null,
      email: 'compras@acme.co',
    });
  });

  it('defaults missing contacts to null and rejects short documents', () => {
    expect(createCustomerRequestSchema.parse({ name: 'A', documentId: '12345' })).toMatchObject({
      phone: null,
      email: null,
    });
    expect(createCustomerRequestSchema.safeParse({ name: 'A', documentId: '1.2-3' }).success).toBe(
      false,
    );
  });

  it('rejects an invalid email', () => {
    expect(
      createCustomerRequestSchema.safeParse({ name: 'A', documentId: '12345', email: 'nope' })
        .success,
    ).toBe(false);
  });
});

describe('customer queries and updates', () => {
  it('defaults the status to active', () => {
    expect(listCustomersQuerySchema.parse({})).toEqual({ status: 'active', page: 1, pageSize: 20 });
  });

  it('accepts partial updates with isActive', () => {
    expect(updateCustomerRequestSchema.parse({ isActive: false })).toEqual({ isActive: false });
  });

  it('normalizes the document of the duplicate check', () => {
    expect(documentMatchesQuerySchema.parse({ documentId: '900.123.456-7' })).toEqual({
      documentId: '9001234567',
    });
  });
});
