import type { QuoteStatus, VatRate } from '@zentia/shared';

export interface Person {
  id: string;
  name: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  unitPrice: string;
  vatRate: VatRate;
  quantity: string;
  lineAmount: string;
}

export interface QuoteTotalsFields {
  discountPct: string;
  discountAmount: string;
  shippingAmount: string;
  subtotal: string;
  linesVat: string;
  shippingVat: string;
  total: string;
}

export interface Quote extends QuoteTotalsFields {
  id: string;
  number: number;
  status: QuoteStatus;
  customer: Person & { documentId: string; isActive: boolean };
  owner: Person;
  createdBy: Person;
  shippingTaxable: boolean;
  /** Fecha `YYYY-MM-DD` (vale hasta el fin del día en Bogotá); `null` en Borrador. */
  expiresAt: string | null;
  sentAt: Date | null;
  firstSentAt: Date | null;
  approvedAt: Date | null;
  currentVersion: number;
  voidReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: QuoteItem[];
}

export const EDITABLE_STATUSES: readonly QuoteStatus[] = ['DRAFT', 'SENT'];

export function isEditable(status: QuoteStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}
