import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';

function capture(): { lines: string[]; write: (line: string) => void } {
  const lines: string[] = [];
  return { lines, write: (line) => lines.push(line) };
}

describe('createLogger redaction', () => {
  it('redacts auth headers, cookies, passwords, logos and base64 payloads', () => {
    const sink = capture();
    const logger = createLogger('info', sink);

    logger.info(
      {
        req: { headers: { authorization: 'Bearer abc.def', cookie: 'zentia_refresh=secret' } },
        res: { headers: { 'set-cookie': 'zentia_refresh=rotated' } },
        body: { password: 'ventas2026x', email: 'ana@empresa.co' },
        settings: { logoDataUrl: 'data:image/png;base64,AAAA' },
        logo: { data: 'iVBORw0KGgo', mimeType: 'image/png' },
      },
      'request',
    );

    const [line = ''] = sink.lines;
    const entry = JSON.parse(line) as Record<string, Record<string, Record<string, string>>>;
    expect(entry['req']?.['headers']).toEqual({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
    });
    expect(entry['res']?.['headers']?.['set-cookie']).toBe('[REDACTED]');
    expect(entry['body']).toEqual({ password: '[REDACTED]', email: 'ana@empresa.co' });
    expect(entry['settings']).toEqual({ logoDataUrl: '[REDACTED]' });
    expect(entry['logo']).toEqual({ data: '[REDACTED]', mimeType: 'image/png' });
    for (const secret of ['abc.def', 'secret', 'rotated', 'ventas2026x', 'AAAA', 'iVBORw0KGgo']) {
      expect(line).not.toContain(secret);
    }
  });
});
