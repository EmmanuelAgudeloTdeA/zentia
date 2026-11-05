/** Abre `mailto:` en la misma pestaña: con `_blank` el navegador deja una pestaña en blanco. */
export function openMailto(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.click();
}

export interface MailDraft {
  to: string;
  subject: string;
  body: string;
}

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
