import { Decimal, type QuoteChanges, type VatRate } from '@zentia/shared';
import type { Quote } from './quote.js';

export interface SnapshotItem {
  productId: string;
  productName: string;
  category: string;
  unitPrice: string;
  vatRate: VatRate;
  quantity: string;
  lineAmount: string;
}

/** Contenido completo de una versión (`QuoteVersion.snapshot`). */
export interface QuoteSnapshot {
  customer: { id: string; name: string; documentId: string };
  items: SnapshotItem[];
  discountPct: string;
  discountAmount: string;
  shippingAmount: string;
  shippingTaxable: boolean;
  subtotal: string;
  linesVat: string;
  shippingVat: string;
  total: string;
  expiresAt: string | null;
}

type SnapshotSource = Pick<
  Quote,
  | 'customer'
  | 'discountPct'
  | 'discountAmount'
  | 'shippingAmount'
  | 'shippingTaxable'
  | 'subtotal'
  | 'linesVat'
  | 'shippingVat'
  | 'total'
  | 'expiresAt'
> & { items: readonly SnapshotItem[] };

export function toSnapshot(quote: SnapshotSource): QuoteSnapshot {
  return {
    customer: {
      id: quote.customer.id,
      name: quote.customer.name,
      documentId: quote.customer.documentId,
    },
    items: quote.items.map(
      ({ productId, productName, category, unitPrice, vatRate, quantity, lineAmount }) => ({
        productId,
        productName,
        category,
        unitPrice,
        vatRate,
        quantity,
        lineAmount,
      }),
    ),
    discountPct: quote.discountPct,
    discountAmount: quote.discountAmount,
    shippingAmount: quote.shippingAmount,
    shippingTaxable: quote.shippingTaxable,
    subtotal: quote.subtotal,
    linesVat: quote.linesVat,
    shippingVat: quote.shippingVat,
    total: quote.total,
    expiresAt: quote.expiresAt,
  };
}

function fromTo(from: string, to: string) {
  return new Decimal(from).eq(to) ? null : { from, to };
}

/** Diferencias de contenido entre dos snapshots; `changed` es false si solo cambió el formato. */
export function diffSnapshots(
  previous: QuoteSnapshot,
  next: QuoteSnapshot,
): { changed: boolean; changes: QuoteChanges } {
  const before = new Map(previous.items.map((item) => [item.productId, item]));
  const after = new Map(next.items.map((item) => [item.productId, item]));
  const line = ({ productId, productName, quantity, unitPrice }: SnapshotItem) => ({
    productId,
    productName,
    quantity,
    unitPrice,
  });

  const added = next.items.filter((item) => !before.has(item.productId)).map(line);
  const removed = previous.items.filter((item) => !after.has(item.productId)).map(line);
  const modified = next.items.flatMap((item) => {
    const old = before.get(item.productId);
    if (!old) return [];
    const quantity = fromTo(old.quantity, item.quantity);
    const unitPrice = fromTo(old.unitPrice, item.unitPrice);
    return quantity || unitPrice
      ? [{ productId: item.productId, productName: item.productName, quantity, unitPrice }]
      : [];
  });
  const discountPct = fromTo(previous.discountPct, next.discountPct);
  const shippingAmount = fromTo(previous.shippingAmount, next.shippingAmount);

  return {
    changed:
      added.length > 0 ||
      removed.length > 0 ||
      modified.length > 0 ||
      discountPct !== null ||
      shippingAmount !== null,
    changes: {
      added,
      removed,
      modified,
      discountPct,
      shippingAmount,
      total: { from: previous.total, to: next.total },
    },
  };
}
