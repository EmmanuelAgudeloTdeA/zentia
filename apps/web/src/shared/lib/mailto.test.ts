import { describe, expect, it } from 'vitest';
import { parseMailto } from './mailto';

describe('parseMailto', () => {
  it('reads recipient, subject and CRLF body as built by the API (RFC 6068)', () => {
    const url =
      'mailto:a%40acme.co?subject=Cotizaci%C3%B3n%20COT-0001%20%E2%80%93%20Zentia&body=Hola%20Acme%2C%0D%0A1%2B1%20%26%20listo';
    expect(parseMailto(url)).toEqual({
      to: 'a@acme.co',
      subject: 'Cotización COT-0001 – Zentia',
      body: 'Hola Acme,\n1+1 & listo',
    });
  });
});
