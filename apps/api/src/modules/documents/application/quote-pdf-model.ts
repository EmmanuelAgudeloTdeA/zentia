import type { PdfPurpose, QuoteStatus, VatRate } from '@zentia/shared';
import { formatQuoteNumber } from '@zentia/shared';
import type { DocumentProfileDto } from '../../company-settings/index.js';
import type { Quote } from '../../quotes/index.js';

export interface QuotePdfModel {
  company: DocumentProfileDto;
  quote: {
    displayNumber: string;
    status: QuoteStatus;
    issueDate: string;
    expiresAt: string;
    isProjectedExpiry: boolean;
  };
  customer: { name: string; documentId: string; phone: string | null; email: string | null };
  items: {
    productName: string;
    quantity: string;
    unitPrice: string;
    vatRate: VatRate;
    lineAmount: string;
  }[];
  totals: {
    subtotal: string;
    discountPct: string;
    discountAmount: string;
    linesVat: string;
    shippingAmount: string;
    shippingTaxable: boolean;
    shippingVat: string;
    total: string;
  };
  watermark: 'DRAFT' | 'VOIDED' | null;
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const BOGOTA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

interface ModelOptions {
  today: string;
  validityDays: number;
  purpose: PdfPurpose;
  customerContact: { phone: string | null; email: string | null };
}

/** S5.1.1: en Borrador la emisión es hoy y el vencimiento es el previsto; la marca de agua solo en la vista interna. */
export function buildQuotePdfModel(
  quote: Quote,
  company: DocumentProfileDto,
  { today, validityDays, purpose, customerContact }: ModelOptions,
): QuotePdfModel {
  const projected = quote.expiresAt === null;
  const watermark =
    purpose === 'view' && (quote.status === 'DRAFT' || quote.status === 'VOIDED')
      ? quote.status
      : null;
  return {
    company,
    quote: {
      displayNumber: formatQuoteNumber(quote.number),
      status: quote.status,
      issueDate: quote.firstSentAt ? BOGOTA_DAY.format(quote.firstSentAt) : today,
      expiresAt: quote.expiresAt ?? addDays(today, validityDays),
      // Al enviar desde el diálogo la fecha prevista coincide con la real (V1 del ui-brief).
      isProjectedExpiry: projected && purpose === 'view',
    },
    customer: {
      name: quote.customer.name,
      documentId: quote.customer.documentId,
      ...customerContact,
    },
    items: quote.items.map(({ productName, quantity, unitPrice, vatRate, lineAmount }) => ({
      productName,
      quantity,
      unitPrice,
      vatRate,
      lineAmount,
    })),
    totals: {
      subtotal: quote.subtotal,
      discountPct: quote.discountPct,
      discountAmount: quote.discountAmount,
      linesVat: quote.linesVat,
      shippingAmount: quote.shippingAmount,
      shippingTaxable: quote.shippingTaxable,
      shippingVat: quote.shippingVat,
      total: quote.total,
    },
    watermark,
  };
}
