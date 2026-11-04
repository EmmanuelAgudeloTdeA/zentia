import type { DocumentLocale } from '@zentia/shared';
import en from '../../../lang/en.json' with { type: 'json' };
import es from '../../../lang/es.json' with { type: 'json' };
import type { DocumentTranslator } from '../application/index.js';

const DICTIONARIES: Record<DocumentLocale, unknown> = { es, en };
const INTL_LOCALE: Record<DocumentLocale, string> = { es: 'es-CO', en: 'en-US' };

function lookup(dictionary: unknown, key: string): string | undefined {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Traductor mínimo de la `lang/` del back: claves con puntos, marcadores `{{x}}` e `Intl` (sin librerías). */
export class JsonDocumentTranslator implements DocumentTranslator {
  t(key: string, locale: DocumentLocale, params: Record<string, string | number> = {}): string {
    const template = lookup(DICTIONARIES[locale], key) ?? key;
    return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }

  formatMoney(amount: string, locale: DocumentLocale): string {
    const format = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return format.format(BigInt(amount)).replace(/\u00a0/g, ' ');
  }

  formatDay(day: string, locale: DocumentLocale): string {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(`${day}T00:00:00.000Z`));
  }

  formatNumber(value: string, locale: DocumentLocale): string {
    return locale === 'es' ? value.replace('.', ',') : value;
  }
}
