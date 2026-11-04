import { formatQuoteNumber, type QuoteDto, type QuoteSummaryDto } from '@zentia/shared';
import type { Actor } from '../../auth/index.js';
import { allowedActions, type Quote } from '../domain/index.js';
import type { QuoteSummary } from './ports/index.js';
import type { QuotesDependencies } from './quotes-dependencies.js';

export function toQuoteSummaryDto(quote: QuoteSummary): QuoteSummaryDto {
  return {
    id: quote.id,
    number: quote.number,
    displayNumber: formatQuoteNumber(quote.number),
    status: quote.status,
    customer: quote.customer,
    owner: quote.owner,
    total: quote.total,
    expiresAt: quote.expiresAt,
    updatedAt: quote.updatedAt.toISOString(),
  };
}

export async function toQuoteDto(
  deps: Pick<QuotesDependencies, 'clock' | 'actionContributors'>,
  quote: Quote,
  actor: Actor,
): Promise<QuoteDto> {
  const contributed = await Promise.all(
    deps.actionContributors.map((contribute) => contribute(quote, actor)),
  );
  const actions = [
    ...allowedActions(
      { status: quote.status, ownerId: quote.owner.id, expiresAt: quote.expiresAt },
      actor,
      deps.clock.today(),
    ),
    ...contributed.flat(),
  ];
  return {
    ...toQuoteSummaryDto({ ...quote }),
    customer: quote.customer,
    createdBy: quote.createdBy,
    items: quote.items,
    discountPct: quote.discountPct,
    discountAmount: quote.discountAmount,
    shippingAmount: quote.shippingAmount,
    shippingTaxable: quote.shippingTaxable,
    subtotal: quote.subtotal,
    linesVat: quote.linesVat,
    shippingVat: quote.shippingVat,
    sentAt: quote.sentAt?.toISOString() ?? null,
    firstSentAt: quote.firstSentAt?.toISOString() ?? null,
    approvedAt: quote.approvedAt?.toISOString() ?? null,
    currentVersion: quote.currentVersion,
    voidReason: quote.voidReason,
    allowedActions: [...new Set(actions)],
    createdAt: quote.createdAt.toISOString(),
  };
}
