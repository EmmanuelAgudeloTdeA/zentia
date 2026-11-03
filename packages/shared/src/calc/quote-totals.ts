import type { VatRate } from '../enums/index.js';
import { Decimal } from './decimal.js';

export const VAT_RATE_FACTORS: Readonly<Record<VatRate, string>> = {
  GENERAL_19: '0.19',
  REDUCED_5: '0.05',
  EXEMPT: '0',
};

export const SHIPPING_VAT_FACTOR = '0.19';

export interface QuoteLineInput {
  unitPrice: string;
  quantity: string;
  vatRate: VatRate;
}

export interface QuoteTotalsInput {
  items: readonly QuoteLineInput[];
  discountPct: string;
  shippingAmount: string;
  shippingTaxable: boolean;
}

export interface QuoteTotals {
  lineAmounts: Decimal[];
  subtotal: Decimal;
  discountAmount: Decimal;
  linesVat: Decimal;
  shippingVat: Decimal;
  total: Decimal;
}

export interface QuoteTotalsStrings {
  lineAmounts: string[];
  subtotal: string;
  discountAmount: string;
  linesVat: string;
  shippingVat: string;
  total: string;
}

/** Half-up a peso entero, aplicado a cada concepto por separado. */
function toPeso(value: Decimal): Decimal {
  return value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}

/** RN-05: el IVA de líneas se calcula una sola vez sobre el neto de descuento, sin redondear por línea. */
export function calculateQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  const discount = new Decimal(input.discountPct || '0').div(100);
  const lineAmounts = input.items.map((item) =>
    toPeso(new Decimal(item.unitPrice).times(item.quantity)),
  );
  const subtotal = lineAmounts.reduce((sum, amount) => sum.plus(amount), new Decimal(0));
  const grossVat = input.items.reduce(
    (sum, item, index) =>
      sum.plus((lineAmounts[index] ?? new Decimal(0)).times(VAT_RATE_FACTORS[item.vatRate])),
    new Decimal(0),
  );
  const shipping = new Decimal(input.shippingAmount || '0');
  const discountAmount = toPeso(subtotal.times(discount));
  const linesVat = toPeso(new Decimal(1).minus(discount).times(grossVat));
  const shippingVat = input.shippingTaxable
    ? toPeso(shipping.times(SHIPPING_VAT_FACTOR))
    : new Decimal(0);
  const total = subtotal.minus(discountAmount).plus(linesVat).plus(shippingVat).plus(shipping);
  return { lineAmounts, subtotal, discountAmount, linesVat, shippingVat, total };
}

export function quoteTotalsToStrings(totals: QuoteTotals): QuoteTotalsStrings {
  return {
    lineAmounts: totals.lineAmounts.map((amount) => amount.toFixed(0)),
    subtotal: totals.subtotal.toFixed(0),
    discountAmount: totals.discountAmount.toFixed(0),
    linesVat: totals.linesVat.toFixed(0),
    shippingVat: totals.shippingVat.toFixed(0),
    total: totals.total.toFixed(0),
  };
}
