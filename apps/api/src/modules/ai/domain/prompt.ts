import { Decimal, type AmountBucket, type DocumentLocale } from '@zentia/shared';

/** Único dato que recibe el LLM (RN-37): sin nombres, documentos, contactos, números ni texto libre. */
export interface FollowUpPromptInput {
  daysWithoutReply: number;
  amountBucket: AmountBucket;
  categories: string[];
  locale: DocumentLocale;
}

const BUCKETS: readonly [AmountBucket, number][] = [
  ['LT_1M', 1_000_000],
  ['1M_5M', 5_000_000],
  ['5M_20M', 20_000_000],
  ['20M_100M', 100_000_000],
];

/** Rango del monto en vez del valor, para que no identifique la cotización (decisión 79). */
export function amountBucket(total: string): AmountBucket {
  const amount = new Decimal(total);
  return BUCKETS.find(([, limit]) => amount.lt(limit))?.[0] ?? 'GTE_100M';
}

export const MAX_PROMPT_CATEGORIES = 5;

/** Hasta 5 categorías distintas del catálogo, de la línea de mayor monto a la de menor. */
export function promptCategories(
  items: readonly { category: string; lineAmount: string }[],
): string[] {
  const sorted = [...items].sort((a, b) => new Decimal(b.lineAmount).comparedTo(a.lineAmount));
  return [...new Set(sorted.map((item) => item.category))].slice(0, MAX_PROMPT_CATEGORIES);
}

export const MAX_MESSAGE_LENGTH = 600;

/** Reemplaza `{{CLIENTE}}` y `{{VENDEDOR}}`, elimina cualquier otro marcador y recorta a 600 caracteres. */
export function finalizeMessage(text: string, names: { customer: string; seller: string }): string {
  // Una sola pasada con función: los nombres se insertan literales (sin patrones `$`) y no se reprocesan.
  return text
    .replace(/\{\{([^}]*)\}\}/g, (_match, marker: string) => {
      const key = marker.trim();
      if (key === 'CLIENTE') return names.customer;
      if (key === 'VENDEDOR') return names.seller;
      return '';
    })
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH)
    .trim();
}
