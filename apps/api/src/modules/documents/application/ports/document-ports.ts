import type { DocumentLocale } from '@zentia/shared';
import type { QuotePdfModel } from '../quote-pdf-model.js';

export interface PdfRenderer {
  render(model: QuotePdfModel, locale: DocumentLocale): Promise<Buffer>;
}

/** Textos y formatos de los documentos en `documentLocale` (no en el idioma de la interfaz). */
export interface DocumentTranslator {
  t(key: string, locale: DocumentLocale, params?: Record<string, string | number>): string;
  /** Monto COP entero como string → `$ 1.550.000` (es) o `COP 1,550,000` (en). */
  formatMoney(amount: string, locale: DocumentLocale): string;
  /** Fecha `YYYY-MM-DD` → formato del idioma. */
  formatDay(day: string, locale: DocumentLocale): string;
  formatNumber(value: string, locale: DocumentLocale): string;
}
