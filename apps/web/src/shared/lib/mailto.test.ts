import { describe, expect, it } from 'vitest';
import { parseMailto, webmailUrl } from './mailto';

const draft = { to: 'a@acme.co', subject: 'Cotización COT-0001', body: 'Hola,\n1+1 & listo' };

describe('parseMailto', () => {
  it('reads recipient, subject and CRLF body as built by the API (RFC 6068)', () => {
    const url =
      'mailto:a%40acme.co?subject=Cotizaci%C3%B3n%20COT-0001&body=Hola%2C%0D%0A1%2B1%20%26%20listo';
    expect(parseMailto(url)).toEqual(draft);
  });
});

describe('webmailUrl', () => {
  it('builds the Gmail compose page with recipient, subject and body', () => {
    const url = new URL(webmailUrl('GMAIL', draft));
    expect(url.origin + url.pathname).toBe('https://mail.google.com/mail/');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      view: 'cm',
      fs: '1',
      to: 'a@acme.co',
      su: 'Cotización COT-0001',
      body: 'Hola,\n1+1 & listo',
    });
  });

  it('builds the Outlook web compose page with recipient, subject and body', () => {
    const url = new URL(webmailUrl('OUTLOOK', draft));
    expect(url.origin + url.pathname).toBe('https://outlook.office.com/mail/deeplink/compose');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      to: 'a@acme.co',
      subject: 'Cotización COT-0001',
      body: 'Hola,\n1+1 & listo',
    });
  });

  it('encodes spaces as %20, never as + (Outlook would show the + literally)', () => {
    for (const provider of ['GMAIL', 'OUTLOOK'] as const) {
      const url = webmailUrl(provider, draft);
      const search = url.slice(url.indexOf('?') + 1);
      expect(search).not.toContain('+');
      expect(search).toContain('Hola%2C%0A1%2B1%20%26%20listo');
    }
  });
});
