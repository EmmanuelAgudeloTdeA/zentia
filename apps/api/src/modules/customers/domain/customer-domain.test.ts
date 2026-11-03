import { describe, expect, it } from 'vitest';
import { customerSearchTerms, prepareContact } from './customer.js';

describe('prepareContact', () => {
  it('normalizes the phone and keeps the email', () => {
    expect(prepareContact({ phone: '300 123 4567', email: null })).toEqual({
      ok: true,
      phone: '573001234567',
      email: null,
    });
    expect(prepareContact({ phone: null, email: 'a@b.co' })).toEqual({
      ok: true,
      phone: null,
      email: 'a@b.co',
    });
  });

  it('rejects an invalid phone and a missing contact', () => {
    expect(prepareContact({ phone: '604 1234', email: 'a@b.co' })).toEqual({
      ok: false,
      violation: 'INVALID_PHONE',
    });
    expect(prepareContact({ phone: null, email: null })).toEqual({
      ok: false,
      violation: 'CUSTOMER_CONTACT_REQUIRED',
    });
  });
});

describe('customerSearchTerms', () => {
  it('builds normalized terms', () => {
    expect(customerSearchTerms(' José ')).toEqual({
      nameKey: 'jose',
      email: 'josé',
      documentId: 'JOS',
      phoneDigits: null,
    });
    expect(customerSearchTerms('900.123-4')).toMatchObject({
      documentId: '9001234',
      phoneDigits: '9001234',
    });
  });
});
