export interface MailDraft {
  to: string;
  subject: string;
  body: string;
}

export type Webmail = 'GMAIL' | 'OUTLOOK';

/** Destinatario, asunto y cuerpo de un enlace `mailto:` (RFC 6068). */
export function parseMailto(url: string): MailDraft {
  const [address = '', query = ''] = url.replace(/^mailto:/i, '').split('?');
  const params = new URLSearchParams(query.replace(/\+/g, '%2B'));
  return {
    to: decodeURIComponent(address),
    subject: params.get('subject') ?? '',
    body: (params.get('body') ?? '').replace(/\r\n/g, '\n'),
  };
}

/** `%20` en vez de `+`: Outlook web no convierte `+` en espacio (Gmail sí). */
function query(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

/** Redactor web con el correo listo: no depende de tener una aplicación de correo instalada. */
export function webmailUrl(provider: Webmail, { to, subject, body }: MailDraft): string {
  if (provider === 'GMAIL') {
    return `https://mail.google.com/mail/?${query({ view: 'cm', fs: '1', to, su: subject, body })}`;
  }
  return `https://outlook.office.com/mail/deeplink/compose?${query({ to, subject, body })}`;
}
