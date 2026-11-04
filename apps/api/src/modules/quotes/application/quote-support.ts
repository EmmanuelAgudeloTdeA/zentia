import { calculateQuoteTotals, Decimal, quoteTotalsToStrings, type VatRate } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import { assertCanAccess, type Actor } from '../../auth/index.js';
import { checkDiscount, type Quote, type QuoteSnapshot } from '../domain/index.js';
import type { NewQuoteItem, QuoteAmounts, QuotesTransaction } from './ports/index.js';
import type { QuotesDependencies } from './quotes-dependencies.js';

export interface LineDraft {
  productId: string;
  productName: string;
  category: string;
  unitPrice: string;
  vatRate: VatRate;
  quantity: string;
}

/** Los montos se guardan como `Decimal(15,0)`: un valor más largo desbordaría la columna en Postgres. */
export const MAX_AMOUNT_DIGITS = 15;
const AMOUNT_LIMIT = new Decimal(10).pow(MAX_AMOUNT_DIGITS);

function assertAmountsFit(amounts: readonly string[]): void {
  if (amounts.some((amount) => new Decimal(amount).abs().gte(AMOUNT_LIMIT))) {
    throw new AppError('QUOTE_AMOUNT_TOO_LARGE', 400, { maxDigits: MAX_AMOUNT_DIGITS });
  }
}

/** Recalcula siempre en el back con `shared/calc` (RN-05); los totales del cliente se ignoran. */
export function priceLines(
  lines: readonly LineDraft[],
  discountPct: string,
  shippingAmount: string,
  shippingTaxable: boolean,
): { items: NewQuoteItem[]; amounts: QuoteAmounts } {
  const normalized = lines.map((line) => ({
    productId: line.productId,
    productName: line.productName,
    category: line.category,
    unitPrice: line.unitPrice,
    vatRate: line.vatRate,
    quantity: new Decimal(line.quantity).toString(),
  }));
  const totals = quoteTotalsToStrings(
    calculateQuoteTotals({ items: normalized, discountPct, shippingAmount, shippingTaxable }),
  );
  assertAmountsFit([
    ...totals.lineAmounts,
    totals.subtotal,
    totals.discountAmount,
    totals.linesVat,
    totals.shippingVat,
    totals.total,
  ]);
  return {
    items: normalized.map((line, index) => ({
      ...line,
      position: index + 1,
      lineAmount: totals.lineAmounts[index] ?? '0',
    })),
    amounts: {
      discountPct: new Decimal(discountPct).toString(),
      discountAmount: totals.discountAmount,
      shippingAmount: new Decimal(shippingAmount).toFixed(0),
      subtotal: totals.subtotal,
      linesVat: totals.linesVat,
      shippingVat: totals.shippingVat,
      total: totals.total,
    },
  };
}

export function assertNoDuplicateProducts(productIds: readonly string[]): void {
  const duplicated = productIds.find((id, index) => productIds.indexOf(id) !== index);
  if (duplicated) throw new AppError('DUPLICATE_PRODUCT_LINE', 400, { productId: duplicated });
}

export async function discountDecision(
  deps: Pick<QuotesDependencies, 'settings'>,
  actor: Actor,
  from: string,
  to: string,
  status: Quote['status'],
) {
  const { discountLimits } = await deps.settings.getCommercialParameters();
  const check = checkDiscount({ actorRole: actor.role, limits: discountLimits, from, to, status });
  if (!check.ok) throw new AppError('DISCOUNT_LIMIT_EXCEEDED', 403, { limit: check.limit });
  return check.override;
}

/** Bloquea la fila, aplica el alcance y la concurrencia optimista (`updatedAt`). */
export async function loadForMutation(
  tx: QuotesTransaction,
  id: string,
  actor: Actor,
  updatedAt: string,
): Promise<Quote> {
  const quote = (await tx.quotes.lockForUpdate(id)) ? await tx.quotes.findById(id) : null;
  if (!quote) throw new AppError('QUOTE_NOT_FOUND', 404);
  assertCanAccess(actor, quote.owner.id, 'QUOTE_NOT_FOUND');
  if (quote.updatedAt.getTime() !== new Date(updatedAt).getTime()) {
    throw new AppError('QUOTE_CONFLICT', 409);
  }
  return quote;
}

export async function loadVisible(
  deps: Pick<QuotesDependencies, 'quotes'>,
  id: string,
  actor: Actor,
): Promise<Quote> {
  const quote = await deps.quotes.findById(id);
  if (!quote) throw new AppError('QUOTE_NOT_FOUND', 404);
  assertCanAccess(actor, quote.owner.id, 'QUOTE_NOT_FOUND');
  return quote;
}

export function invalidTransition(from: string, to: string): AppError {
  return new AppError('QUOTE_INVALID_TRANSITION', 409, { from, to });
}

export function requireCustomerRequest(value: string | undefined): string {
  const text = value?.trim() ?? '';
  if (!text) throw new AppError('CUSTOMER_REQUEST_REQUIRED', 400);
  return text;
}

/** Snapshot del estado que resultará de una operación (para versiones y diffs). */
export function snapshotOf(
  quote: Quote,
  items: readonly NewQuoteItem[],
  amounts: QuoteAmounts,
  expiresAt: string | null,
): QuoteSnapshot {
  return {
    customer: {
      id: quote.customer.id,
      name: quote.customer.name,
      documentId: quote.customer.documentId,
    },
    items: items.map(({ position: _position, ...item }) => item),
    ...amounts,
    shippingTaxable: quote.shippingTaxable,
    expiresAt,
  };
}
